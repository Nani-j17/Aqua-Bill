import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { RiEyeLine, RiEyeOffLine, RiLoader4Line, RiCheckLine, RiCloseLine } from 'react-icons/ri';

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

function FormInput({ type, placeholder, value, onChange, icon: Icon, error, disabled, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative">
      <div
        className={`relative bg-white/10 backdrop-blur-sm border rounded-lg transition-all duration-300 ${
          isFocused ? 'border-blue-400 shadow-lg shadow-blue-400/25' : 'border-white/20'
        } ${error ? 'border-red-400 shadow-lg shadow-red-400/25' : ''}`}
      >
        {Icon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60">
            <Icon className="text-xl" />
          </div>
        )}
      <input
          type={type === 'password' ? (showPassword ? 'text' : 'password') : type}
          placeholder={placeholder}
        value={value}
        onChange={onChange}
          disabled={disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
          className={`w-full px-4 py-4 bg-transparent text-white placeholder-white/60 focus:outline-none transition-all duration-300 ${
            Icon ? 'pl-12' : 'pl-4'
          } ${type === 'password' ? 'pr-12' : 'pr-4'}`}
          {...props}
      />
      {type === 'password' && (
        <button
          type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
          >
            {showPassword ? <RiEyeOffLine className="text-xl" /> : <RiEyeLine className="text-xl" />}
          </button>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-sm mt-2 ml-1"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

export default function LoginPage() {
  const gradient = React.useMemo(() => getRandomGradient(), []);
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        const isAdmin = data.user.email === 'admin@aquabill.com';
        
        if (isAdmin) {
          setShowAdminPrompt(true);
        } else {
          navigate('/dashboard');
        }
      }
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const type = params.get('type');

    if (token && type === 'recovery') {
      handlePasswordReset(token);
    }
  }, [location]);

  const handlePasswordReset = async (token) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) throw error;

      setSuccess('Password updated successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (error) throw error;

        const isAdmin = data.user.email === 'admin@aquabill.com';
        
        if (isAdmin) {
          navigate('/admin');
        } else {
            navigate('/dashboard');
        }
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName
            }
          }
        });

        if (error) throw error;

        if (data.user && !data.session) {
          setSuccess('Please check your email for verification link');
        } else {
          const isAdmin = data.user.email === 'admin@aquabill.com';
          if (isAdmin) {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/login?type=recovery`
      });

      if (error) throw error;

      setSuccess('Password reset link sent to your email');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminContinue = () => {
    setShowAdminPrompt(false);
    navigate('/admin');
  };

  const handleAdminLogout = async () => {
    await supabase.auth.signOut();
    setShowAdminPrompt(false);
    setFormData({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: gradient, transition: 'background 1s cubic-bezier(.4,0,.2,1)' }}>
      <div className="w-full max-w-md mx-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl"
        >
            <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <span className="text-3xl">💧</span>
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h1>
            <p className="text-blue-100">
              {mode === 'login' ? 'Sign in to your account' : 'Join AquaBill today'}
              </p>
            </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  type="text"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
                <FormInput
                  type="text"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
                  </div>
                )}

                  <FormInput
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />

                  <FormInput
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
            />

            {mode === 'signup' && (
              <FormInput
                type="password"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            )}

              {mode === 'login' && (
              <div className="flex justify-end">
                  <button
                    type="button"
                  onClick={handleForgotPassword}
                  className="text-blue-200 hover:text-white text-sm transition-colors"
                  >
                  Forgot Password?
                  </button>
                </div>
              )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white py-4 rounded-lg font-semibold hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <RiLoader4Line className="animate-spin" />
                  <span>{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
                </>
              ) : (
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-blue-100">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setError('');
                  setSuccess('');
                }}
                className="text-white font-semibold hover:underline transition-all"
              >
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-500/20 border border-red-400/30 rounded-lg flex items-center space-x-2"
            >
              <RiCloseLine className="text-red-400 text-xl" />
              <span className="text-red-200">{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-green-500/20 border border-green-400/30 rounded-lg flex items-center space-x-2"
            >
              <RiCheckLine className="text-green-400 text-xl" />
              <span className="text-green-200">{success}</span>
            </motion.div>
          )}
        </motion.div>
      </div>

      {showAdminPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 text-center"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👨‍💼</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Admin Access Detected</h3>
            <p className="text-gray-600 mb-6">
              You are logged in as an administrator. Would you like to continue to the admin dashboard?
            </p>
            <div className="flex space-x-3">
                    <button
                onClick={handleAdminLogout}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                    >
                Logout & Sign in as Different User
                    </button>
                    <button
                onClick={handleAdminContinue}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                    >
                Continue to Admin Dashboard
                    </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
} 