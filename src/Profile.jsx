import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RiUserLine, RiPhoneLine, RiCalendarLine, RiHomeLine, RiCheckLine, RiEdit2Line, RiSaveLine, RiCloseLine, RiLockLine, RiImageEditLine, RiLogoutBoxLine } from 'react-icons/ri';
import { Link, useLocation } from 'react-router-dom';
import { Droplets } from 'lucide-react';
import { supabase } from './supabaseClient';

const gradientColors = [
  '#6366f1', '#22d3ee', '#06b6d4', '#818cf8', '#3b82f6', '#0ea5e9', '#a5b4fc', '#38bdf8', '#67e8f9', '#5eead4', '#f472b6', '#fbbf24',
];
function getRandomGradient() {
  let idx1 = Math.floor(Math.random() * gradientColors.length);
  let idx2;
  do {
    idx2 = Math.floor(Math.random() * gradientColors.length);
  } while (idx2 === idx1);
  const color1 = gradientColors[idx1];
  const color2 = gradientColors[idx2];
  return `linear-gradient(120deg, ${color1} 0%, ${color2} 100%)`;
}

// Helper to generate random account number
function generateAccountNumber() {
  let num = '';
  for (let i = 0; i < 5; i++) {
    num += Math.floor(Math.random() * 9) + 1;
  }
  return `AQB-${num}`;
}

// Remove initialProfile and dummy state
// Add useEffect to fetch profile from Supabase on mount
// Add save logic to update/insert profile in Supabase



const stagger = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      type: 'spring',
    },
  }),
};

export default function Profile() {
  const [profile, setProfile] = useState({
    email: '',
    mobile: '',
    dob: '',
    address: '',
    account_number: '',
    connection_status: '',
    join_date: '',
    serviceType: '',
    notifications: { email: true, sms: false },
  });
  const [loading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const gradient = React.useMemo(() => getRandomGradient(), []);
  const location = useLocation();
  // eslint-disable-next-line no-unused-vars
  const [user] = useState(null);
  const [dobInput, setDobInput] = React.useState('');
  const [validation, setValidation] = useState({ mobile: true, dob: true });
  const [showErrors, setShowErrors] = useState(false);
  // In the component, fetch first_name and last_name from Supabase Auth
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [picPreview, setPicPreview] = useState('');
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
  const [mobileModified, setMobileModified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  // On page load, fetch profile and set picPreview from DB
  useEffect(() => {
    async function fetchProfile() {
      // 1. Get user from Supabase Auth
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;
      setFirstName((user.user_metadata?.first_name || '').trim());
      setLastName((user.user_metadata?.last_name || '').trim());
      // 2. Fetch profile from DB
      let { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      let needsUpdate = false;
      // 3. If not exist, create with join_date and account_number
      if (!dbProfile) {
        const joinDate = user.created_at?.slice(0, 10);
        const accountNumber = generateAccountNumber();
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            join_date: joinDate,
            account_number: accountNumber,
            // ...other default fields
          })
          .select()
          .single();
        dbProfile = newProfile;
      } else {
        // 4. If missing join_date or account_number, update them
        const updates = {};
        if (!dbProfile.join_date) {
          updates.join_date = user.created_at?.slice(0, 10);
          needsUpdate = true;
        }
        if (!dbProfile.account_number) {
          updates.account_number = generateAccountNumber();
          needsUpdate = true;
        }
        if (needsUpdate) {
          const { data: updatedProfile } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();
          dbProfile = updatedProfile;
        }
      }
      // Defensive: If still no dbProfile, set defaults and return
      if (!dbProfile) {
        setProfile({
          email: user.email || '',
          mobile: '',
          dob: '',
          address: '',
          account_number: '',
          connection_status: '',
          join_date: '',
          serviceType: '',
          notifications: { email: true, sms: false },
        });
        setProfilePhotoUrl('');
        setPicPreview('');
        return;
      }
      setProfile({
        email: user.email || '',
        mobile: dbProfile.mobile || '',
        dob: dbProfile.dob || '',
        address: dbProfile.address || '',
        account_number: dbProfile.account_number || '',
        connection_status: dbProfile.connection_status || '',
        join_date: dbProfile.join_date || '',
        serviceType: dbProfile.serviceType || '',
        notifications: dbProfile.notifications || { email: true, sms: false },
      });
      setProfilePhotoUrl(dbProfile.profile_photo_url || '');
      setPicPreview(dbProfile.profile_photo_url || '');
    }
    fetchProfile();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const jwt = data.session.access_token;
        // Decode the JWT (at https://jwt.io or using atob in browser)
        console.log('JWT:', jwt);
      }
    });
  }, []);

  function validateMobile(mobile) {
    // Only allow 10 digits, starting with 6-9
    return /^[6-9][0-9]{9}$/.test(mobile);
  }
  function validateDob(dob) {
    if (!dob) return false;
    const match = /^\d{4}-\d{2}-\d{2}$/.test(dob);
    if (!match) return false;
    const year = parseInt(dob.slice(0, 4), 10);
    const currentYear = new Date().getFullYear();
    return year >= 1900 && year <= currentYear;
  }

  const handleField = (field, value) => {
    if (field === 'dob') {
      setDobInput(value);
      setValidation(v => ({ ...v, dob: validateDob(value) }));
      if (validateDob(value)) setProfile(p => ({ ...p, dob: value }));
      return;
    }
    if (field === 'mobile') {
      let digits = value.replace(/\D/g, '').slice(0, 10);
      setValidation(v => ({ ...v, mobile: validateMobile(digits) }));
      setProfile(p => ({ ...p, mobile: digits }));
      // Track if mobile number has been modified
      if (editMode && digits !== profile.mobile) {
        setMobileModified(true);
        setMobileVerified(false);
      }
      return;
    }
    if (field === 'address') {
      setProfile(p => ({ ...p, address: value }));
      return;
    }
    setProfile(p => ({ ...p, [field]: value }));
  };

  const handleMobileVerify = async () => {
    if (!profile.mobile || !validation.mobile) return;
    
    // Show OTP modal
    setShowOtpModal(true);
    setOtpInput('');
    setOtpError('');
    
    // Here you would typically send an OTP or verification code
    // For now, we'll simulate sending OTP
    console.log(`OTP sent to ${profile.mobile}`);
  };

  const handleOtpVerify = async () => {
    if (!otpInput.trim()) {
      setOtpError('Please enter the OTP');
      return;
    }
    
    setOtpLoading(true);
    setOtpError('');
    
    // Simulate OTP verification
    setTimeout(() => {
      setOtpLoading(false);
      if (otpInput === '123456') { // Demo OTP
        setMobileVerified(true);
        setMobileModified(false);
        setShowOtpModal(false);
        setOtpInput('');
      } else {
        setOtpError('Invalid OTP. Please try again.');
      }
    }, 1500);
  };

  const handleNotif = (type) => setProfile(p => ({ ...p, notifications: { ...p.notifications, [type]: !p.notifications[type] } }));
  const fileInputRef = useRef();
  const handlePic = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPicPreview(URL.createObjectURL(file));
    setPendingPhotoFile(file);
  };


  // On Save, upload photo if needed, then update profile
  const handleSave = async () => {
    setShowErrors(true);
    setSaving(true);
    setSaveError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaveError('You must be logged in to save.');
      setSaving(false);
      return;
    }
    let photoUrl = profilePhotoUrl;
    if (pendingPhotoFile) {
      try {
        const filePath = `${user.id}-${Date.now()}.${pendingPhotoFile.name.split('.').pop()}`;
        // eslint-disable-next-line no-unused-vars
        const { data, error } = await supabase.storage
          .from('profile-photos')
          .upload(filePath, pendingPhotoFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: pendingPhotoFile.type
          });
        if (error) {
          setSaveError('Failed to upload photo: ' + error.message);
          setSaving(false);
          console.error('Upload error:', error);
          return;
        }
        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(filePath);
        if (!publicUrlData || !publicUrlData.publicUrl) {
          setSaveError('Failed to get public URL for photo.');
          setSaving(false);
          console.error('Public URL error:', publicUrlData);
          return;
        }
        photoUrl = publicUrlData.publicUrl;
        setPicPreview(photoUrl);
        setProfilePhotoUrl(photoUrl);
        console.log('Photo uploaded and public URL:', photoUrl);
      } catch (err) {
        setSaveError('Unexpected error during photo upload.');
        setSaving(false);
        console.error('Unexpected upload error:', err);
        return;
      }
    }
    // Only send fields that exist in the DB
    const updatableProfile = {
      mobile: profile.mobile,
      dob: profile.dob,
      service_type: profile.serviceType || 'Residential',
      account_number: profile.account_number,
      connection_status: profile.connection_status || 'Active',
      join_date: profile.join_date,
      address: profile.address || '',
      notifications_email: profile.notifications?.email ?? true,
      notifications_sms: profile.notifications?.sms ?? false,
      profile_photo_url: photoUrl || '',
    };
    try {
      // eslint-disable-next-line no-unused-vars
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(updatableProfile)
        .eq('id', user.id)
        .select()
        .single();
      if (error) {
        setSaveError(error.message || 'Failed to save profile. Please try again.');
        console.error('Supabase update error:', error);
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        setEditMode(false);
        setPendingPhotoFile(null);
        setProfilePhotoUrl(updatedProfile?.profile_photo_url || photoUrl || '');
        setPicPreview(updatedProfile?.profile_photo_url || photoUrl || '');
        // Defensive: If updatedProfile is null, set defaults
        if (!updatedProfile) {
          setProfile(p => ({ ...p }));
        } else {
          setProfile({
            email: updatedProfile.email || profile.email || '',
            mobile: updatedProfile.mobile || '',
            dob: updatedProfile.dob || '',
            address: updatedProfile.address || '',
            account_number: updatedProfile.account_number || '',
            connection_status: updatedProfile.connection_status || '',
            join_date: updatedProfile.join_date || '',
            serviceType: updatedProfile.serviceType || '',
            notifications: updatedProfile.notifications || { email: true, sms: false },
          });
        }
      }
    } catch (err) {
      setSaveError('Unexpected error during profile save.');
      console.error('Unexpected save error:', err);
    }
    setSaving(false);
  };


  const handleCancel = () => {
    setEditMode(false);
    setSaveSuccess(false);
    setSaving(false);
    setSaveError('');
    setMobileModified(false);
    setMobileVerified(false);
    setShowOtpModal(false);
    setOtpInput('');
    setOtpError('');
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      window.location.href = '/'; // Redirect to login or home page
    } else {
      alert('Failed to sign out. Please try again.');
    }
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handlePasswordSave = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    if (!newPassword || !confirmPassword) {
      setPasswordError('Please fill in both fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) {
      setPasswordError(error.message || 'Failed to update password.');
    } else {
      setPasswordSuccess('Password updated successfully!');
      setTimeout(() => setShowPasswordModal(false), 1500);
    }
  };

  React.useEffect(() => { setDobInput(profile?.dob); }, [profile?.dob]);

  // Form is valid if all required fields are valid
  const formValid = validation.mobile && (profile?.dob ? validation.dob : true);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center" style={{ background: gradient, transition: 'background 1s cubic-bezier(.4,0,.2,1)' }}>
      <header className="w-full px-0 py-4 md:py-6 flex justify-center">
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }} className="w-full max-w-5xl flex items-center justify-between px-6 md:px-10">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/60 shadow-lg backdrop-blur-md">
              <Droplets size={32} className="text-primary" />
            </span>
            <span className="text-2xl md:text-3xl font-pacifico text-primary tracking-tight select-none">AquaBill</span>
          </div>
          <nav className="flex-1 flex justify-center px-2">
            <div className="flex gap-2 bg-white/60 backdrop-blur-md rounded-full px-2 py-1 shadow-lg overflow-x-auto no-scrollbar whitespace-nowrap max-w-full">
              <Link to="/dashboard" className={`flex items-center gap-1 px-4 md:px-6 py-2 ${location.pathname === '/dashboard' ? 'text-primary bg-blue-50' : 'text-gray-600 hover:text-primary hover:bg-blue-50'} rounded-full font-medium transition-colors`}><i className="ri-dashboard-line" /><span>Dashboard</span></Link>
              <Link to="/billing" className={`flex items-center gap-1 px-4 md:px-6 py-2 ${location.pathname === '/billing' ? 'text-primary bg-blue-50' : 'text-gray-600 hover:text-primary hover:bg-blue-50'} rounded-full font-medium transition-colors`}><i className="ri-bill-line" /><span>Billing</span></Link>
              <Link to="/support" className={`flex items-center gap-1 px-4 md:px-6 py-2 ${location.pathname === '/support' ? 'text-primary bg-blue-50' : 'text-gray-600 hover:text-primary hover:bg-blue-50'} rounded-full font-medium transition-colors`}><i className="ri-customer-service-line" /><span>Support</span></Link>
            </div>
          </nav>
          <div className="flex items-center gap-6">
            <div className="flex items-center bg-white/60 rounded-full px-2 py-2 shadow backdrop-blur-md">
              <Link to="/profile">
                <span className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                  {picPreview ? (
                    <img src={picPreview} alt="Profile" className="object-cover w-full h-full" />
                  ) : (
                  <RiUserLine size={32} className="text-primary" />
                  )}
                </span>
              </Link>
            </div>
          </div>
        </motion.div>
      </header>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className="w-full max-w-4xl mx-auto mt-12 mb-8">
        {loading || !profile ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Droplets size={60} className="text-primary animate-spin" />
            <p className="mt-4 text-lg text-gray-600">Loading your profile...</p>
          </div>
        ) : (
          <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.7, type: 'spring' }} className="bg-white/30 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/40 p-0 flex flex-col items-center relative overflow-hidden">
            {/* Profile Picture */}
            <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, type: 'spring' }} className="w-full flex flex-col items-center pt-8 md:pt-10 pb-4 bg-gradient-to-r from-blue-400/40 to-fuchsia-400/40">
              <div className="relative">
                <motion.div whileHover={editMode ? { scale: 1.08, boxShadow: '0 0 0 8px #f472b633' } : {}} animate={editMode ? { scale: [1, 1.04, 1], boxShadow: ['0 0 0 0px #f472b633', '0 0 0 12px #f472b633', '0 0 0 0px #f472b633'] } : {}} transition={editMode ? { repeat: Infinity, duration: 1.6, ease: 'easeInOut' } : {}} className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-blue-400 to-fuchsia-400 shadow-lg flex items-center justify-center overflow-hidden border-4 border-white">
                  {picPreview ? (
                    <img src={picPreview} alt="Profile" className="object-cover w-full h-full" />
                  ) : (
                    <RiUserLine size={80} className="text-white/80" />
                  )}
                </motion.div>
                {editMode && (
                  <button className="absolute bottom-2 right-2 bg-fuchsia-500 hover:bg-fuchsia-600 text-white rounded-full p-2 shadow transition-colors" onClick={() => fileInputRef.current.click()}><RiImageEditLine size={24} /></button>
                )}
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePic} />
              </div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="mt-4 text-3xl font-bold text-primary drop-shadow">{firstName || ''} {lastName || ''}</motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="text-lg text-gray-500 mb-2">{profile.email}</motion.div>
            </motion.div>

            {/* Personal Info Card */}
            <motion.div initial="hidden" animate="visible" variants={stagger} className="w-full px-12 pt-8 pb-3 grid grid-cols-1 md:grid-cols-2 gap-8">
              <AnimatedField i={0}>
                <FloatingInput
                  label="First Name"
                  value={firstName}
                  disabled
                  readOnly
                  placeholder="First Name"
                />
              </AnimatedField>
              <AnimatedField i={0.5}>
                <FloatingInput
                  label="Last Name"
                  value={lastName}
                  disabled
                  readOnly
                  placeholder="Last Name"
                />
              </AnimatedField>
              <AnimatedField i={1}>
                <FloatingInput
                  label="Mobile"
                  icon={<RiPhoneLine />}
                  value={profile.mobile || ''}
                  onChange={v => handleField('mobile', v)}
                  disabled={!editMode}
                  placeholder="Enter 10 digit mobile"
                  maxLength={10}
                  error={showErrors && !validation.mobile && profile.mobile ? 'Please enter a valid 10 digit mobile number starting with 6-9.' : ''}
                  showVerifyButton={editMode && mobileModified}
                  onVerify={handleMobileVerify}
                  isVerified={mobileVerified}
                />
              </AnimatedField>
              <AnimatedField i={2}>
                <FloatingInput label="Date of Birth" icon={<RiCalendarLine />} value={dobInput || ''} onChange={v => handleField('dob', v)} onBlur={() => setValidation(v => ({ ...v, dob: validateDob(dobInput) }))} disabled={!editMode} type="date" min="1900-01-01" max={new Date().toISOString().split('T')[0]} error={showErrors && !validation.dob && dobInput ? 'Please enter a valid date of birth in YYYY-MM-DD format.' : ''} />
              </AnimatedField>
              <AnimatedField i={3}>
                <div className="w-full">
                  <label className="block text-gray-500 text-sm mb-1 ml-1">Service Type</label>
                  <div className="relative w-full">
                    <select
                      className="w-full bg-white border border-gray-300 rounded-lg px-12 pt-6 pb-2 text-gray-800 font-semibold shadow focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 appearance-none hover:bg-blue-50 hover:border-blue-400 cursor-pointer"
                      value={profile.serviceType || 'Residential'}
                      onChange={e => handleField('serviceType', e.target.value)}
                      disabled={!editMode}
                      style={{ minHeight: '48px' }}
                    >
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                    <span className="absolute left-4 top-2 text-gray-400 text-lg pointer-events-none"><RiHomeLine /></span>
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl pointer-events-none">▼</span>
                  </div>
                </div>
              </AnimatedField>
              <AnimatedField i={4}><FloatingInput label="Account Number" icon={<RiHomeLine />} value={profile.account_number} disabled readOnly /></AnimatedField>
              <AnimatedField i={5}><FloatingInput label="Join Date" icon={<RiCalendarLine />} value={profile.join_date} disabled readOnly /></AnimatedField>
              <AnimatedField i={6}>
                <label className="block text-gray-500 text-sm mb-1 ml-1">Connection Status</label>
                <div className="relative w-full bg-gray-100 border rounded-lg flex items-center px-4 py-3 text-gray-800" style={{ minHeight: '48px' }}>
                  <span className="text-green-500 mr-2 text-lg">&#10003;</span>
                  <span className="font-medium text-gray-700">{profile.connection_status || 'Active'}</span>
                </div>
              </AnimatedField>
              <AnimatedField i={7} className="col-span-2">
                <label className="block text-gray-500 text-sm mb-1 ml-1">Address</label>
                <motion.div
                  className="relative w-full bg-gray-100 border rounded-lg"
                  animate={document.activeElement && document.activeElement.classList.contains('address-textarea') ? { scale: 1.04, boxShadow: '0 0 0 4px #3b82f633', borderColor: '#3b82f6' } : { scale: 1, boxShadow: '0 0 0 0px #0000', borderColor: '#d1d5db' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  whileHover={{ scale: 1.04, boxShadow: '0 0 0 4px #3b82f633', borderColor: '#3b82f6' }}
                >
                  <textarea
                    className="address-textarea w-full bg-transparent border-none outline-none px-4 py-3 text-gray-800 resize-none focus:ring-0 focus:border-none focus:outline-none transition-all duration-200"
                    value={profile.address || ''}
                    onChange={e => handleField('address', e.target.value)}
                    rows={2}
                    disabled={!editMode}
                  />
                </motion.div>
              </AnimatedField>
            </motion.div>

            {/* Account Info Card */}
            <motion.div initial="hidden" animate="visible" variants={stagger} className="w-full px-12 pt-2 pb-3 grid grid-cols-1 md:grid-cols-2 gap-8">
            </motion.div>

            {/* Preferences Card */}
            <motion.div initial="hidden" animate="visible" variants={stagger} className="w-full px-12 pt-2 pb-3 grid grid-cols-1 md:grid-cols-2 gap-8">
              <AnimatedField i={8}>
                <div className="flex items-center gap-6">
                  <label className="text-gray-500 text-sm">Notifications:</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="accent-blue-500" checked={profile.notifications.email} onChange={() => editMode && handleNotif('email')} disabled={!editMode} /> Email
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="accent-blue-500" checked={profile.notifications.sms} onChange={() => editMode && handleNotif('sms')} disabled={!editMode} /> SMS
                  </label>
                </div>
              </AnimatedField>
            </motion.div>

            {/* Change Password Button */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }} className="w-full flex justify-center mt-2 mb-2">
              <button type="button" className="px-6 py-3 bg-blue-500 text-white rounded-full font-bold shadow-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-lg" onClick={handleChangePassword}><RiLockLine /> Change Password</button>
            </motion.div>

            {/* Edit Button */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.5 }} className="w-full flex justify-center mt-2 mb-2">
              {!editMode && (
                <motion.button whileHover={{ scale: 1.05 }} className="flex items-center gap-2 px-6 py-2 bg-blue-100 text-blue-700 font-bold rounded-full shadow-lg hover:bg-blue-200 transition-colors text-lg" onClick={() => setEditMode(true)}><RiEdit2Line /> Edit</motion.button>
              )}
            </motion.div>

            {/* Edit/Save/Cancel Buttons (when editing) */}
            {editMode && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.5 }} className="flex items-center gap-4 mt-2 mb-2 justify-center">
                  <motion.button whileTap={{ scale: 0.97 }} className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white font-bold rounded-full shadow-lg hover:bg-blue-600 transition-colors disabled:bg-blue-200 text-lg" onClick={handleSave} disabled={saving || !formValid}><RiSaveLine /> {saving ? 'Saving...' : 'Save'}</motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded-full shadow-lg hover:bg-gray-300 transition-colors text-lg" onClick={handleCancel}><RiCloseLine /> Cancel</motion.button>
              </motion.div>
              )}

            {/* Sign Out Button */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.5 }} className="w-full flex justify-center mt-6 mb-4">
              <motion.button whileHover={{ scale: 1.05 }} className="flex items-center gap-2 px-8 py-3 bg-red-500 text-white font-bold rounded-full shadow-lg hover:bg-red-600 transition-colors border border-red-200 text-lg" onClick={handleSignOut}><RiLogoutBoxLine /> Sign Out</motion.button>
            </motion.div>

            {saveError && (
              <div className="flex items-center gap-2 mt-2 mb-2 text-red-600 font-semibold justify-center text-lg">{saveError}</div>
            )}
            <AnimatePresence>
              {saveSuccess && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.5 }} className="flex items-center gap-2 mt-2 mb-2 text-green-600 font-semibold justify-center text-lg"><RiCheckLine /> Profile saved!</motion.div>
              )}
            </AnimatePresence>

            {/* Change Password Modal */}
            <AnimatePresence>
              {showPasswordModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <motion.div initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 40 }} transition={{ duration: 0.3, type: 'spring' }} className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center relative border-2 border-blue-200">
                    <RiLockLine size={36} className="text-blue-500 mb-2" />
                    <div className="text-xl font-bold mb-2 text-gray-800">Change Password</div>
                    <div className="w-full flex flex-col gap-3 mt-2">
                      <input type="password" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-lg" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={passwordLoading} />
                      <input type="password" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-lg" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={passwordLoading} />
                    </div>
                    {passwordError && <div className="text-red-500 mt-2 text-sm font-semibold">{passwordError}</div>}
                    {passwordSuccess && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.5 }} className="text-green-600 mt-2 text-sm font-semibold">{passwordSuccess}</motion.div>}
                    <div className="flex gap-4 mt-6 w-full justify-center">
                      <motion.button whileTap={{ scale: 0.97 }} className="px-6 py-2 bg-blue-500 text-white rounded-full font-bold shadow hover:bg-blue-600 transition-colors text-lg disabled:bg-blue-200" onClick={handlePasswordSave} disabled={passwordLoading}>{passwordLoading ? 'Saving...' : 'Save'}</motion.button>
                      <motion.button whileTap={{ scale: 0.97 }} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full font-bold shadow hover:bg-gray-300 transition-colors text-lg" onClick={() => setShowPasswordModal(false)} disabled={passwordLoading}>Cancel</motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* OTP Verification Modal */}
            <AnimatePresence>
              {showOtpModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <motion.div initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 40 }} transition={{ duration: 0.3, type: 'spring' }} className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center relative border-2 border-blue-200">
                    <RiPhoneLine size={36} className="text-blue-500 mb-2" />
                    <div className="text-xl font-bold mb-2 text-gray-800">Verify Mobile Number</div>
                    <div className="text-sm text-gray-600 mb-4 text-center">Enter the 6-digit code sent to</div>
                    <div className="text-lg font-semibold text-gray-800 mb-4">{profile.mobile}</div>
                    <div className="w-full flex flex-col gap-3 mt-2">
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all text-lg text-center tracking-widest" 
                        placeholder="Enter OTP" 
                        value={otpInput} 
                        onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                        disabled={otpLoading}
                        maxLength={6}
                        autoFocus
                      />
                    </div>
                    {otpError && <div className="text-red-500 mt-2 text-sm font-semibold">{otpError}</div>}
                    <div className="flex gap-4 mt-6 w-full justify-center">
                      <motion.button whileTap={{ scale: 0.97 }} className="px-6 py-2 bg-blue-500 text-white rounded-full font-bold shadow hover:bg-blue-600 transition-colors text-lg disabled:bg-blue-200" onClick={handleOtpVerify} disabled={otpLoading}>{otpLoading ? 'Verifying...' : 'Verify'}</motion.button>
                      <motion.button whileTap={{ scale: 0.97 }} className="px-6 py-2 bg-red-500 text-white rounded-full font-bold shadow hover:bg-red-600 transition-colors text-lg" onClick={() => setShowOtpModal(false)} disabled={otpLoading}>Cancel</motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

function AnimatedField({ i, className = '', children }) {
  return (
    <motion.div custom={i} initial="hidden" animate="visible" variants={stagger} className={className}>
      {children}
    </motion.div>
  );
}

function FloatingInput({ label, icon, value, onChange, disabled, type = 'text', readOnly, placeholder, error, onBlur, maxLength, min, max, showVerifyButton, onVerify, isVerified }) {
  const [isFocused, setIsFocused] = React.useState(false);
  return (
    <div className="w-full">
      <label className="block text-gray-500 text-sm mb-1 ml-1">{label}</label>
      <motion.div
        className={`relative w-full bg-gray-100 border rounded-lg ${isFocused ? 'border-white bg-white' : 'border-gray-300'}`}
        animate={isFocused ? { scale: 1.04, boxShadow: '0 0 0 4px #3b82f633', borderColor: '#3b82f6' } : { scale: 1, boxShadow: '0 0 0 0px #0000', borderColor: '#d1d5db' }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        whileHover={{ scale: 1.04, boxShadow: '0 0 0 4px #3b82f633', borderColor: '#3b82f6', backgroundColor: '#fff', border: '1px solid #fff' }}
      >
        <span className="absolute left-4 top-2 text-gray-400 text-lg pointer-events-none">{icon}</span>
        <input
          type={type}
          className={`peer w-full bg-transparent ${showVerifyButton ? 'pr-28' : 'px-12'} pt-6 pb-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 ${disabled ? 'opacity-70 cursor-default' : ''}`}
          value={value}
          onChange={e => onChange && onChange(e.target.value)}
          disabled={disabled}
          readOnly={readOnly}
          onFocus={() => setIsFocused(true)}
          onBlur={onBlur ? onBlur : () => setIsFocused(false)}
          placeholder={placeholder}
          maxLength={maxLength}
          min={min}
          max={max}
        />
        {showVerifyButton && (
          <button
            onClick={onVerify}
            disabled={!value || value.length !== 10 || disabled}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              isVerified 
                ? 'bg-green-500 text-white cursor-default' 
                : value && value.length === 10
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isVerified ? '✓ Verified' : 'Verify'}
          </button>
        )}
      </motion.div>
      {error && <div className="text-xs text-red-500 mt-1 ml-1">{error}</div>}
    </div>
  );
} 