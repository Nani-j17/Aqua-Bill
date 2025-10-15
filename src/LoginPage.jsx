import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Droplets, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useLocation, useNavigate } from 'react-router-dom';

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

// Move FormInput OUTSIDE of LoginPage to fix focus issue
function FormInput({ label, type = 'text', name, value, onChange, error, placeholder, required = false, autoComplete, showPassword, setShowPassword }) {
  // eslint-disable-next-line no-unused-vars
  const [isFocused, setIsFocused] = useState(false);
  const inputType = type === 'password' && showPassword ? 'text' : type;
  return (
    <div className="input-group relative">
      <input
        id={name}
        name={name}
        type={inputType}
        value={value}
        onChange={onChange}
        placeholder={placeholder || ' '}
        autoComplete={autoComplete}
        required={required}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`form-input pr-10 ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
      />
      <label htmlFor={name} className={`floating-label pointer-events-none select-none ${error ? 'text-red-500' : ''}`}>{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      {type === 'password' && (
        <button
          type="button"
          onClick={() => setShowPassword(s => !s)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      )}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });
  const [successMessage, setSuccessMessage] = useState('');
  const [signupJustCompleted, setSignupJustCompleted] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [accessToken, setAccessToken] = useState('');
  const gradient = useMemo(() => getRandomGradient(), []);
  const signupSuccessTimeout = useRef();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [currentAdminUser, setCurrentAdminUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in and redirect accordingly
    async function checkCurrentUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Supabase connection error:', error.message);
        } else if (data.user) {
          console.log('User already logged in:', data.user);
          
          // Check if user is admin
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', data.user.id)
              .single();

            const isAdmin = (data.user.email === 'admin@aquabill.com') || 
                           (!profileError && profileData && profileData.role === 'admin');
            
            console.log('Current user is admin?', isAdmin);
            
            // Check if user is admin and show prompt instead of auto-redirect
            if (isAdmin) {
              console.log('Admin user detected, showing prompt');
              setCurrentAdminUser(data.user);
              setShowAdminPrompt(true);
            } else if (location.pathname === '/') {
              console.log('Redirecting logged-in user to /dashboard');
              navigate('/dashboard');
            }
          } catch (profileErr) {
            console.error('Profile check error:', profileErr);
            if (location.pathname === '/') {
              navigate('/dashboard');
            }
          }
        } else {
          console.log('No user logged in');
        }
      } catch (err) {
        console.error('Supabase connection failed:', err);
      }
    }
    checkCurrentUser();
  }, [navigate, location.pathname]);

  // Check if we're on the reset password route and extract token
  useEffect(() => {
    if (location.pathname === '/reset-password') {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', '?'));
      const token = params.get('access_token');
      if (token) {
        setAccessToken(token);
        setMode('reset');
      } else {
        setResetError('Invalid or missing token. Please use the password reset link from your email.');
      }
    }
  }, [location.pathname]);

  // Also react to Supabase auth state for password recovery
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
      }
    });
    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  function validatePassword(password) {
    const feedback = [];
    let score = 0;
    if (password.length >= 8) score += 1; else feedback.push('At least 8 characters');
    if (/[a-z]/.test(password)) score += 1; else feedback.push('At least one lowercase letter');
    if (/[A-Z]/.test(password)) score += 1; else feedback.push('At least one uppercase letter');
    if (/[0-9]/.test(password)) score += 1; else feedback.push('At least one number');
    if (/[^A-Za-z0-9]/.test(password)) score += 1; else feedback.push('At least one special character');
    return { score, feedback };
  }

  function validateForm() {
    const newErrors = {};
    if (mode === 'signup') {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
      else if (formData.firstName.trim().length < 2) newErrors.firstName = 'First name must be at least 2 characters';
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
      else if (formData.lastName.trim().length < 2) newErrors.lastName = 'Last name must be at least 2 characters';
    }
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email address';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (mode === 'signup' && passwordStrength.score < 3) newErrors.password = 'Password is too weak';
    if (mode === 'signup') {
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (name === 'password' && mode === 'signup') setPasswordStrength(validatePassword(value));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccessMessage('');
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      if (mode === 'login') {
        console.log('Attempting login with:', formData.email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        
        console.log('Login response:', { data, error });
        
        if (error) {
          console.error('Login error:', error);
          setErrors({ general: error.message });
        } else {
          console.log('Login successful, user:', data.user);
          // Check if user has admin role
          if (data.user) {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

              console.log('Profile data:', profileData);
              console.log('Profile error:', profileError);
              console.log('User role:', profileData?.role);
              console.log('User email:', data.user.email);
              
                          // Check if user is admin by email (simplified)
            const isAdmin = data.user.email === 'admin@aquabill.com';
            
            console.log('Is admin?', isAdmin);
            
            if (isAdmin) {
              console.log('Redirecting to admin dashboard');
              setSuccessMessage('Admin login successful! Redirecting to admin dashboard...');
              console.log('Navigating to /admin immediately');
              navigate('/admin');
            } else {
              console.log('Redirecting to user dashboard');
              setSuccessMessage('Login successful! Redirecting to dashboard...');
              console.log('Navigating to /dashboard immediately');
              navigate('/dashboard');
            }
                         } catch (profileErr) {
               console.error('Profile check error:', profileErr);
               // Fallback: redirect to user dashboard
               setSuccessMessage('Login successful! Redirecting to dashboard...');
               console.log('Fallback: navigating to /dashboard');
               navigate('/dashboard');
             }
          }
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
            },
          },
        });
        if (error) {
          setErrors({ general: error.message });
        } else {
          // Create profile row with join_date and account_number
          if (data?.user) {
            await supabase.from('profiles').insert({
              id: data.user.id,
              First_name: formData.firstName,
              Last_name: formData.lastName,
              email: formData.email,
              join_date: new Date().toISOString().slice(0, 10),
              account_number: `AQB-${Math.floor(10000 + Math.random() * 90000)}`
            });
          }
          setSuccessMessage('Signup successful! Please check your email to confirm your account.');
          setSignupJustCompleted(true);
          signupSuccessTimeout.current = setTimeout(() => {
            setMode('login');
            setSuccessMessage('');
            setSignupJustCompleted(false);
          }, 3000);
        }
      }
    } catch (error) {
      setErrors({ general: error.message || 'Authentication failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setForgotStatus('');
    if (!forgotEmail || !/\S+@\S+\.\S+/.test(forgotEmail)) {
      setForgotStatus('Please enter a valid email address.');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) {
        setForgotStatus(error.message);
      } else {
        setForgotStatus('Password reset email sent! Please check your inbox.');
      }
    } catch (err) {
      setForgotStatus('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    if (!resetPassword || !resetConfirmPassword) {
      setResetError('Please fill in all fields.');
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      // Update password using Supabase
      const { error: updateError } = await supabase.auth.updateUser({ password: resetPassword });
      if (updateError) {
        setResetError(updateError.message);
      } else {
        setResetSuccess('Password reset successful! Logging you in...');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    } catch (err) {
      setResetError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Cleanup timeout on unmount or mode change
  useEffect(() => {
    return () => {
      if (signupSuccessTimeout.current) clearTimeout(signupSuccessTimeout.current);
    };
  }, [mode]);

  function getPasswordStrengthColor() {
    if (passwordStrength.score <= 2) return 'text-red-500';
    if (passwordStrength.score <= 3) return 'text-yellow-500';
    if (passwordStrength.score <= 4) return 'text-blue-500';
    return 'text-green-500';
  }
  function getPasswordStrengthText() {
    if (passwordStrength.score <= 2) return 'Weak';
    if (passwordStrength.score <= 3) return 'Fair';
    if (passwordStrength.score <= 4) return 'Good';
    return 'Strong';
  }

  // Show admin prompt if admin is already logged in
  if (showAdminPrompt && currentAdminUser) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
        <div
          className="animated-gradient-bg fixed inset-0 w-full h-full -z-10"
          aria-hidden="true"
          style={{ background: gradient }}
        />
        <div className="w-full max-w-md z-10">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-500 rounded-3xl shadow-2xl mb-4">
              <Droplets size={40} className="text-white drop-shadow-lg" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight drop-shadow">Aqua Bill</h1>
            <p className="text-lg text-gray-700 font-medium drop-shadow-sm">Admin Access</p>
          </div>
          <div className="card animate-float bg-white/40 backdrop-blur-xl border-2 border-transparent bg-clip-padding relative overflow-hidden">
            <div className="relative z-10 p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👤</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, Admin!</h2>
                <p className="text-gray-600 mb-6">You're already logged in as an administrator.</p>
              </div>
              <div className="space-y-4">
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full btn-primary flex items-center justify-center"
                >
                  Continue to Admin Dashboard
                  <ArrowRight size={20} className="ml-2" />
                </button>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setShowAdminPrompt(false);
                    setCurrentAdminUser(null);
                  }}
                  className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors font-medium"
                >
                  Logout & Sign in as Different User
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div
        className="animated-gradient-bg fixed inset-0 w-full h-full -z-10"
        aria-hidden="true"
        style={{ background: gradient }}
      />
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-500 rounded-3xl shadow-2xl mb-4">
            <Droplets size={40} className="text-white drop-shadow-lg" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight drop-shadow">Aqua Bill</h1>
          <p className="text-lg text-gray-700 font-medium drop-shadow-sm">Modern billing solutions</p>
        </div>
        <div className="card animate-float bg-white/40 backdrop-blur-xl border-2 border-transparent bg-clip-padding relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {mode === 'login' ? 'Welcome back' : 
                 mode === 'signup' ? 'Create account' : 
                 mode === 'forgot' ? 'Reset Password' :
                 'Set New Password'}
              </h1>
              <p className="text-gray-600">
                {mode === 'login' ? 'Sign in to your account to continue' : 
                 mode === 'signup' ? 'Join us and start your journey today' :
                 mode === 'forgot' ? 'Enter your email to receive a password reset link' :
                 'Enter your new password below'}
              </p>
            </div>
            {mode === 'forgot' ? (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <FormInput
                  label="Email Address"
                  type="email"
                  name="forgotEmail"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  error={forgotStatus && !forgotStatus.startsWith('Password reset') ? forgotStatus : ''}
                  placeholder="Enter your email address"
                  required
                  autoComplete="email"
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                />
                {forgotStatus && (
                  <div className={`p-3 rounded-lg ${
                    forgotStatus.startsWith('Password reset') 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`text-sm ${
                      forgotStatus.startsWith('Password reset') 
                        ? 'text-green-700' 
                        : 'text-red-700'
                    }`}>
                      {forgotStatus}
                    </p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Sending...
                    </div>
                  ) : (
                    <>
                      Send Reset Email
                      <ArrowRight size={20} className="ml-2" />
                    </>
                  )}
                </button>
              </form>
            ) : mode === 'reset' ? (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <FormInput
                  label="New Password"
                  type="password"
                  name="resetPassword"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  error={resetError}
                  placeholder="Enter new password"
                  required
                  autoComplete="new-password"
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                />
                <FormInput
                  label="Confirm Password"
                  type="password"
                  name="resetConfirmPassword"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  error={resetError}
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                />
                {resetError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{resetError}</p>
                  </div>
                )}
                {resetSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">{resetSuccess}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Resetting...
                    </div>
                  ) : (
                    <>
                      Reset and Login
                      <ArrowRight size={20} className="ml-2" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {mode === 'signup' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="First Name"
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    error={errors.firstName}
                    placeholder="Enter your first name"
                    required
                    autoComplete="given-name"
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                  />
                  <FormInput
                    label="Last Name"
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    error={errors.lastName}
                    placeholder="Enter your last name"
                    required
                    autoComplete="family-name"
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                  />
                </div>
              )}
              <FormInput
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                placeholder="Enter your email"
                required
                autoComplete="email"
                showPassword={showPassword}
                setShowPassword={setShowPassword}
              />
              <FormInput
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
                placeholder={mode === 'login' ? 'Enter your password' : 'Create a strong password'}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
              />
              {mode === 'signup' && (
                <>
                  {formData.password && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Password strength:</span>
                        <span className={`text-sm font-medium ${getPasswordStrengthColor()}`}>{getPasswordStrengthText()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            passwordStrength.score <= 2 ? 'bg-red-500' :
                            passwordStrength.score <= 3 ? 'bg-yellow-500' :
                            passwordStrength.score <= 4 ? 'bg-blue-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        ></div>
                      </div>
                      {passwordStrength.feedback.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {passwordStrength.feedback.map((item, index) => (
                            <li key={index} className="text-xs text-gray-600 flex items-center">
                              <span className="mr-1">•</span>{item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  <FormInput
                    label="Confirm Password"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    error={errors.confirmPassword}
                    placeholder="Confirm your password"
                    required
                    autoComplete="new-password"
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                  />
                </>
              )}
              {errors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="error-message">{errors.general}</p>
                </div>
              )}
              {mode === 'signup' && signupJustCompleted && successMessage && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="success-message">{successMessage}</p>
                </div>
              )}
              {mode === 'login' && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-indigo-500 focus:ring-indigo-400 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-600">Remember me</span>
                  </label>
                  <button
                    type="button"
                    className="text-sm text-indigo-500 hover:text-indigo-700 font-medium"
                    onClick={() => { setMode('forgot'); setForgotStatus(''); setForgotEmail(formData.email); }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}
              {mode === 'signup' && (
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="terms"
                    className="h-4 w-4 text-indigo-500 focus:ring-indigo-400 border-gray-300 rounded mt-1"
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                    required
                  />
                  <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                    I agree to the{' '}
                    <button type="button" className="text-indigo-500 hover:text-indigo-700 font-medium">Terms of Service</button>{' '}and{' '}
                    <button type="button" className="text-indigo-500 hover:text-indigo-700 font-medium">Privacy Policy</button>
                  </label>
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading || (mode === 'signup' && !agreedToTerms)}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </div>
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={20} className="ml-2" />
                  </>
                )}
              </button>
            </form>
            )}
            <div className="mt-8 text-center">
              <p className="text-gray-600">
                {mode === 'login' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                    >
                      Sign up here
                    </button>
                  </>
                ) : mode === 'signup' ? (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                    >
                      Sign in here
                    </button>
                  </>
                ) : mode === 'forgot' ? (
                  <>
                    Remember your password?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                    >
                      Back to login
                    </button>
                  </>
                ) : mode === 'reset' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                    >
                      Back to login
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="text-center mt-8 animate-fade-in">
          <p className="text-sm text-gray-500">
            © 2024 Aqua Bill. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
} 