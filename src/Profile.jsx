import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { RiUserLine, RiDashboardLine, RiBillLine, RiCustomerServiceLine, RiCameraLine, RiSaveLine, RiLoader4Line, RiCheckLine, RiCloseLine } from 'react-icons/ri';
import dayjs from 'dayjs';

const gradientColors = [
  '#6366f1', '#22d3ee', '#06b6d4', '#818cf8', '#3b82f6', '#0ea5e9', '#a5b4fc', '#38bdf8', '#67e8f9', '#5eead4', '#f472b6', '#fbbf24',
];

function getRandomGradient() {
  let idx1 = Math.floor(Math.random() * gradientColors.length);
  let idx2;
  do { idx2 = Math.floor(Math.random() * gradientColors.length); } while (idx2 === idx1);
  const color1 = gradientColors[idx1];
  const color2 = gradientColors[idx2];
  return `linear-gradient(120deg, ${color1} 0%, ${color2} 100%)`;
}

function generateAccountNumber() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString().slice(2, 6);
  return `AQB-${timestamp}${random}`;
}

export default function Profile() {
  const gradient = React.useMemo(() => getRandomGradient(), []);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    mobile: '',
    dob: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    join_date: '',
    account_number: ''
  });
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [picPreview, setPicPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [mobileModified, setMobileModified] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id);
      }
    }
    fetchUser();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data: dbProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        const joinDate = dayjs().format('YYYY-MM-DD');
        const accountNumber = generateAccountNumber();
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            first_name: user?.user_metadata?.full_name?.split(' ')[0] || '',
            last_name: user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            email: user?.email,
            join_date: joinDate,
            account_number: accountNumber,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) throw insertError;
        
        setProfile({
          ...newProfile,
          join_date: joinDate,
          account_number: accountNumber
        });
      } else if (error) {
        throw error;
      } else {
        if (!dbProfile.join_date || !dbProfile.account_number) {
          const updates = {};
          if (!dbProfile.join_date) updates.join_date = dayjs().format('YYYY-MM-DD');
          if (!dbProfile.account_number) updates.account_number = generateAccountNumber();
          
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

          if (updateError) throw updateError;
          setProfile(updatedProfile);
        } else {
          setProfile(dbProfile);
        }
      }

      if (dbProfile?.profile_photo_url) {
        setProfilePhotoUrl(dbProfile.profile_photo_url);
        setPicPreview(dbProfile.profile_photo_url);
      }
    } catch (error) {
      setProfile({
        first_name: user?.user_metadata?.full_name?.split(' ')[0] || '',
        last_name: user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        email: user?.email || '',
        mobile: '',
        dob: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        join_date: dayjs().format('YYYY-MM-DD'),
        account_number: generateAccountNumber()
      });
    }
  };

  useEffect(() => {
    if (user) {
      supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          const jwt = session.access_token;
        }
      });
    }
  }, [user]);

  function validateMobile(mobile) {
    return /^[6-9][0-9]{9}$/.test(mobile);
  }

  function validatePincode(pincode) {
    return /^[1-9][0-9]{5}$/.test(pincode);
  }

  const handleInputChange = (field, value) => {
    if (field === 'dob') {
      const date = dayjs(value);
      if (date.isValid()) {
        setProfile(prev => ({ ...prev, dob: date.format('YYYY-MM-DD') }));
      }
    } else if (field === 'mobile') {
      const cleaned = value.replace(/\D/g, '').slice(0, 10);
      setProfile(prev => ({ ...prev, mobile: cleaned }));
      setMobileModified(true);
    } else {
      setProfile(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleMobileVerification = async () => {
    if (!validateMobile(profile.mobile)) {
      setOtpError('Please enter a valid 10-digit mobile number');
      return;
    }

    setShowOtpModal(true);
    setOtpInput('');
    setOtpError('');
  };

  const handleOtpVerify = async () => {
    if (!otpInput.trim()) {
      setOtpError('Please enter the OTP');
      return;
    }
    
    if (otpInput === '123456') {
      setShowOtpModal(false);
      setOtpError('');
      setMobileModified(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setOtpError('Invalid OTP. Please try again.');
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSaveError('File size should be less than 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setSaveError('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    setPicPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setSaveError('');

    try {
      let photoUrl = profilePhotoUrl;

      if (picPreview && picPreview !== profilePhotoUrl && picPreview.startsWith('blob:')) {
        const file = await fetch(picPreview).then(r => r.blob());
        const fileName = `profile-${user.id}-${Date.now()}.jpg`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(fileName);

        photoUrl = publicUrl;
        setProfilePhotoUrl(photoUrl);
      }

      const updatedProfile = {
        first_name: profile.first_name,
        last_name: profile.last_name,
        mobile: profile.mobile,
        dob: profile.dob,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        pincode: profile.pincode,
        profile_photo_url: photoUrl,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updatedProfile)
        .eq('id', user.id);

      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const isFormValid = profile.first_name && profile.last_name && profile.mobile && validateMobile(profile.mobile);

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: gradient, transition: 'background 1s cubic-bezier(.4,0,.2,1)' }}>
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
              <p className="text-blue-100">Manage your account information and settings</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all">
                <RiDashboardLine className="text-xl" />
                <span>Dashboard</span>
              </Link>
              <Link to="/billing" className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all">
                <RiBillLine className="text-xl" />
                <span>Billing</span>
              </Link>
              <Link to="/support" className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all">
                <RiCustomerServiceLine className="text-xl" />
                <span>Support</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-2 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
            >
              <h2 className="text-2xl font-semibold text-white mb-6">Personal Information</h2>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">First Name *</label>
                    <input
                      type="text"
                      value={profile.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Last Name *</label>
                    <input
                      type="text"
                      value={profile.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Email</label>
                    <input
                      type="email"
                      value={profile.email || user?.email || ''}
                      disabled
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white/60 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Mobile Number *</label>
                    <div className="flex space-x-2">
                      <input
                        type="tel"
                        value={profile.mobile}
                        onChange={(e) => handleInputChange('mobile', e.target.value)}
                        className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="10-digit mobile number"
                        maxLength="10"
                        required
                      />
                      {mobileModified && (
                        <button
                          type="button"
                          onClick={handleMobileVerification}
                          className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                        >
                          Verify
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={profile.dob || ''}
                      onChange={(e) => handleInputChange('dob', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Account Number</label>
                    <input
                      type="text"
                      value={profile.account_number || ''}
                      disabled
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white/60 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Address</label>
                  <textarea
                    value={profile.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">City</label>
                    <input
                      type="text"
                      value={profile.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">State</label>
                    <input
                      type="text"
                      value={profile.state || ''}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Pincode</label>
                    <input
                      type="text"
                      value={profile.pincode || ''}
                      onChange={(e) => handleInputChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      maxLength="6"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-all"
                  >
                    Logout
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!isFormValid || saving}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <RiLoader4Line className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <RiSaveLine />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-6"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">Profile Photo</h3>
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <img
                      src={picPreview || profilePhotoUrl || 'https://via.placeholder.com/150x150?text=U'}
                      alt="Profile"
                      className="w-32 h-32 rounded-full border-4 border-white/30 object-cover"
                    />
                    <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-all">
                      <RiCameraLine className="text-lg" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-blue-100 text-sm text-center">
                    Click the camera icon to upload a new photo
                  </p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">Account Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-white/60">Join Date</label>
                    <p className="text-white font-medium">
                      {profile.join_date ? dayjs(profile.join_date).format('DD/MM/YYYY') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/60">Account Number</label>
                    <p className="text-white font-medium">{profile.account_number || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/60">Email</label>
                    <p className="text-white font-medium">{profile.email || user?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {showOtpModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Verify Mobile Number</h3>
            <p className="text-gray-600 mb-4">
              Enter the OTP sent to {profile.mobile}
            </p>
            <input
              type="text"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
              placeholder="Enter 6-digit OTP"
              maxLength="6"
            />
            {otpError && (
              <p className="text-red-500 text-sm mb-4">{otpError}</p>
            )}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowOtpModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleOtpVerify}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
              >
                Verify
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {saveSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RiCheckLine className="text-3xl text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Profile Updated!</h3>
            <p className="text-gray-600 mb-6">
              Your profile has been updated successfully.
            </p>
            <button
              onClick={() => setSaveSuccess(false)}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
            >
              Got it!
            </button>
          </motion.div>
        </div>
      )}

      {saveError && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 text-center"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RiCloseLine className="text-3xl text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Error</h3>
            <p className="text-gray-600 mb-6">{saveError}</p>
            <button
              onClick={() => setSaveError('')}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
            >
              Try Again
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
} 