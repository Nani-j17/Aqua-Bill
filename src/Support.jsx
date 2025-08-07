import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { RiCustomerServiceLine, RiDashboardLine, RiBillLine, RiUserLine, RiSendLine, RiCloseLine, RiCheckLine, RiLoader4Line } from 'react-icons/ri';

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

export default function Support() {
  const gradient = React.useMemo(() => getRandomGradient(), []);
  const [user, setUser] = useState(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [form, setForm] = useState({
    category: '',
    subject: '',
    message: '',
    account: '',
    priority: 'medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');

  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        setUser(data.user);
        await fetchProfilePhoto(data.user.id);
      }
    }
    fetchUser();
  }, []);

  const fetchProfilePhoto = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('profile_photo_url')
        .eq('id', userId)
        .single();
      
      if (!error && data?.profile_photo_url) {
        setProfilePhotoUrl(data.profile_photo_url);
      }
    } catch (error) {
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setErrorMessage('Please log in to submit a support request');
      setShowErrorPopup(true);
      return;
    }

    if (!form.category || !form.subject || !form.message || !form.account) {
      setErrorMessage('Please fill in all required fields');
      setShowErrorPopup(true);
      return;
    }

    if (!form.account.startsWith('AQB-') || form.account.length < 8) {
      setErrorMessage('Please enter a valid account number (AQB-XXXXXXX)');
      setShowErrorPopup(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('support_requests')
        .insert({
          user_id: user.id,
          category: form.category,
          subject: form.subject,
          message: form.message,
          account_number: form.account,
          priority: form.priority,
          status: 'New',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      setForm({
        category: '',
        subject: '',
        message: '',
        account: '',
        priority: 'medium'
      });

      setShowSuccessPopup(true);
    } catch (error) {
      setErrorMessage('Failed to submit request. Please try again.');
      setShowErrorPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccountChange = (e) => {
    let val = e.target.value;
    if (val.startsWith('AQB-')) {
      val = val.substring(4);
    }
    val = val.replace(/[^0-9]/g, '');
    const finalVal = val ? `AQB-${val}` : '';
    setForm({ ...form, account: finalVal });
  };

  const handleAccountFocus = (e) => {
    if (!form.account) {
      setForm({ ...form, account: 'AQB-' });
    }
  };

  const quickLinks = [
    { name: 'Billing Issues', icon: '💰', description: 'Payment problems, bill disputes' },
    { name: 'Technical Support', icon: '🔧', description: 'App issues, login problems' },
    { name: 'Account Management', icon: '👤', description: 'Profile updates, account changes' },
    { name: 'Service Information', icon: 'ℹ️', description: 'General inquiries, service details' }
  ];

  const faqs = [
    {
      question: 'How do I update my payment method?',
      answer: 'Go to the Billing section and click on "Payment Methods" to add or update your payment information.'
    },
    {
      question: 'What should I do if my payment fails?',
      answer: 'Check your payment method details and ensure sufficient funds. If the problem persists, contact our support team.'
    },
    {
      question: 'How can I view my usage history?',
      answer: 'Visit the Dashboard to see your daily, weekly, and monthly water usage analytics.'
    },
    {
      question: 'How do I change my account information?',
      answer: 'Go to your Profile section to update personal information, contact details, and account settings.'
    }
  ];

  const chatbotResponses = {
    'billing': 'For billing issues, please check your payment method in the Billing section. If you need further assistance, submit a support request.',
    'technical': 'For technical issues, try refreshing the page or clearing your browser cache. If the problem persists, contact our support team.',
    'account': 'You can update your account information in the Profile section. For account-related issues, submit a support request.',
    'service': 'For general service inquiries, check our FAQ section or submit a support request for specific questions.',
    'default': 'I\'m here to help! Please check our FAQ section or submit a support request for specific assistance.'
  };

  const handleChatMessage = (message) => {
    const lowerMessage = message.toLowerCase();
    let response = chatbotResponses.default;

    if (lowerMessage.includes('billing') || lowerMessage.includes('payment') || lowerMessage.includes('bill')) {
      response = chatbotResponses.billing;
    } else if (lowerMessage.includes('technical') || lowerMessage.includes('app') || lowerMessage.includes('login')) {
      response = chatbotResponses.technical;
    } else if (lowerMessage.includes('account') || lowerMessage.includes('profile')) {
      response = chatbotResponses.account;
    } else if (lowerMessage.includes('service') || lowerMessage.includes('general')) {
      response = chatbotResponses.service;
    }

    const newMessage = {
      id: Date.now(),
      text: message,
      isUser: true,
      timestamp: new Date()
    };

    const botResponse = {
      id: Date.now() + 1,
      text: response,
      isUser: false,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, newMessage, botResponse]);
    setCurrentMessage('');
  };

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: gradient, transition: 'background 1s cubic-bezier(.4,0,.2,1)' }}>
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Support & Help</h1>
              <p className="text-blue-100">Get help and support for your water billing needs</p>
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
              <Link to="/profile" className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all">
                <RiUserLine className="text-xl" />
                <span>Profile</span>
              </Link>
              <div className="relative">
                <img
                  src={profilePhotoUrl || 'https://via.placeholder.com/40x40?text=U'}
                  alt="Profile"
                  className="w-10 h-10 rounded-full border-2 border-white/30"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
            >
              <h2 className="text-2xl font-semibold text-white mb-6">Submit a Support Request</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({...form, category: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="billing">Billing Issues</option>
                    <option value="technical">Technical Support</option>
                    <option value="account">Account Management</option>
                    <option value="service">Service Information</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Subject *</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({...form, subject: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Brief description of your issue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Account Number *</label>
                  <input
                    className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 flex-1"
                    placeholder="Account Number*"
                    value={form.account}
                    onChange={handleAccountChange}
                    onFocus={handleAccountFocus}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({...form, priority: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Message *</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({...form, message: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    placeholder="Please describe your issue in detail..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <RiLoader4Line className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <RiSendLine />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-6"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">Quick Links</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {quickLinks.map((link, index) => (
                    <div
                      key={index}
                      className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{link.icon}</span>
                        <div>
                          <h4 className="font-semibold text-white">{link.name}</h4>
                          <p className="text-blue-100 text-sm">{link.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">Frequently Asked Questions</h3>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div key={index} className="border-b border-white/20 pb-4 last:border-b-0">
                      <h4 className="font-semibold text-white mb-2">{faq.question}</h4>
                      <p className="text-blue-100 text-sm">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-all z-40"
      >
        <RiCustomerServiceLine className="text-2xl" />
      </button>

      {chatOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-end z-50 p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md h-96 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Customer Support</h3>
              <button
                onClick={() => setChatOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <RiCloseLine className="text-2xl" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <RiCustomerServiceLine className="text-4xl mx-auto mb-2 text-blue-500" />
                  <p>How can I help you today?</p>
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        message.isUser
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && currentMessage.trim() && handleChatMessage(currentMessage.trim())}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={() => currentMessage.trim() && handleChatMessage(currentMessage.trim())}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                >
                  <RiSendLine />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showSuccessPopup && (
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
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Request Submitted!</h3>
            <p className="text-gray-600 mb-6">
              Your support request has been submitted successfully. We'll get back to you soon.
            </p>
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
            >
              Got it!
            </button>
          </motion.div>
        </div>
      )}

      {showErrorPopup && (
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
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <button
              onClick={() => setShowErrorPopup(false)}
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