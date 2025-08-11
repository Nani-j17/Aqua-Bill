import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from './supabaseClient';
import { RiDashboardLine, RiBillLine, RiCustomerServiceLine, RiUserLine, RiChat1Line, RiMailLine, RiPhoneLine, RiBook2Line, RiDownloadLine, RiArrowDownSLine, RiAddLine, RiAddFill, RiSubtractFill } from 'react-icons/ri';

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
const faqGroups = [
  {
    title: 'Billing',
    questions: [
      { q: 'How do I view my current water bill?', a: 'Log in and go to the Billing page to see your latest bill and payment status.' },
      { q: 'How can I download my previous bills?', a: 'On the Billing page, use the Download button next to each bill in your history.' },
      { q: 'What should I do if my bill seems incorrect?', a: 'Submit a support request with your bill details and our team will review it.' },
    ]
  },
  {
    title: 'Payments',
    questions: [
      { q: 'What payment methods are accepted?', a: 'We accept Credit Card, Bank Transfer, and UPI.' },
      { q: 'Can I set up automatic payments?', a: 'Yes, enable auto-pay in the Billing section under Payment Methods.' },
      { q: 'How do I know if my payment was successful?', a: 'You will receive a confirmation email and see the status updated in your Billing History.' },
    ]
  },
  {
    title: 'Account',
    questions: [
      { q: 'How do I update my contact information?', a: 'Go to your Profile page and click Edit to update your details.' },
      { q: 'What if I forgot my password?', a: 'Use the Forgot Password link on the login page to reset your password.' },
      { q: 'How do I change my email address?', a: 'Submit a support request and our team will assist you.' },
    ]
  },
  {
    title: 'Technical',
    questions: [
      { q: 'Why can\'t I log in to my account?', a: 'Check your credentials and internet connection. If the issue persists, reset your password or contact support.' },
      { q: 'How do I report a technical issue?', a: 'Use the Submit a Support Request form and select Technical Issue as the category.' },
    ]
  },
  {
    title: 'Service',
    questions: [
      { q: 'How do I report a water leak?', a: 'Submit a support request or call our emergency contact for urgent issues.' },
      { q: 'How do I request a new water connection?', a: 'Submit a support request with your details and our team will assist you.' },
    ]
  },
];

export default function Support() {
  const gradient = React.useMemo(() => getRandomGradient(), []);
  const [openFAQ, setOpenFAQ] = useState(null);
  const [form, setForm] = useState({ name: '', account: '', category: 'Billing & Payments', message: '' });
  const [chatOpen, setChatOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [user, setUser] = useState(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const isFormValid = form.name && form.account && form.account.startsWith('AQB-') && form.account.length > 4 && form.message;
  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        setUser(data.user);
        // Fetch profile photo
        await fetchProfilePhoto(data.user.id);
      }
    }
    fetchUser();
  }, []);

  // Function to fetch profile photo
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
      console.log('No profile photo found or error fetching:', error);
    }
  };
  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: gradient, transition: 'background 1s cubic-bezier(.4,0,.2,1)' }}>
      <header className="w-full px-0 py-6 flex justify-center">
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }} className="w-full max-w-5xl flex items-center justify-between px-6 md:px-10">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/60 shadow-lg backdrop-blur-md">
              <RiCustomerServiceLine size={32} className="text-primary" />
            </span>
            <span className="text-3xl font-pacifico text-primary tracking-tight select-none">AquaBill</span>
          </div>
          <nav className="flex-1 flex justify-center">
            <div className="flex gap-2 bg-white/60 backdrop-blur-md rounded-full px-2 py-1 shadow-lg">
              <Link to="/dashboard" className={`flex items-center gap-1 px-6 py-2 ${location.pathname === '/dashboard' ? 'text-primary bg-blue-50' : 'text-gray-600 hover:text-primary hover:bg-blue-50'} rounded-full font-medium transition-colors`}><RiDashboardLine /><span>Dashboard</span></Link>
              <Link to="/billing" className={`flex items-center gap-1 px-6 py-2 ${location.pathname === '/billing' ? 'text-primary bg-blue-50' : 'text-gray-600 hover:text-primary hover:bg-blue-50'} rounded-full font-medium transition-colors`}><RiBillLine /><span>Billing</span></Link>
              <Link to="/support" className={`flex items-center gap-1 px-6 py-2 ${location.pathname === '/support' ? 'text-primary bg-blue-50' : 'text-gray-600 hover:text-primary hover:bg-blue-50'} rounded-full font-medium transition-colors`}><RiCustomerServiceLine /><span>Support</span></Link>
            </div>
          </nav>
          <div className="flex items-center gap-6">
            <div className="flex items-center bg-white/60 rounded-full px-2 py-2 shadow backdrop-blur-md">
              <Link to="/profile">
                <span className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt="Profile" className="object-cover w-full h-full" />
                  ) : (
                    <RiUserLine size={32} className="text-primary" />
                  )}
                </span>
              </Link>
            </div>
          </div>
        </motion.div>
      </header>
      <main className="flex-1 w-full flex flex-col items-center px-2 md:px-0">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className="w-full max-w-5xl mt-6">
          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-white drop-shadow text-center">Customer Support Center</h2>
            <p className="text-gray-100 mt-1 text-center">Get the help you need, when you need it</p>
          </div>
          <div className="flex flex-col gap-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.03, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)', borderColor: '#3b82f6' }} transition={{ delay: 0.1, duration: 0.5, type: 'spring' }} className="bg-white/40 backdrop-blur-lg p-8 rounded-2xl shadow-lg border border-white/30 hover:border-blue-400 transition-all duration-300 cursor-pointer max-w-2xl mx-auto text-center">
                <div className="flex flex-col items-center">
                  <span className="text-blue-500 mb-2"><RiChat1Line size={48} /></span>
                  <div className="text-2xl font-bold mb-2">Live Chat Support</div>
                  <div className="text-gray-500 mb-4">Connect with our AI assistant for instant help</div>
                  <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full px-8 py-3 text-lg transition-colors shadow" onClick={() => setChatOpen(true)}>Start Chat</button>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.03, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)', borderColor: '#3b82f6' }} transition={{ delay: 0.2, duration: 0.5, type: 'spring' }} className="bg-white/40 backdrop-blur-lg p-8 rounded-2xl shadow-lg border border-white/30 hover:border-blue-400 transition-all duration-300 cursor-pointer max-w-2xl mx-auto">
                <div className="text-xl font-semibold mb-4 text-gray-800">Submit a Support Request</div>
                <form className="flex flex-col gap-4" onSubmit={async (e) => { 
                  e.preventDefault(); 
                  if (!user) {
                    alert('Please log in to submit a support request.');
                    return;
                  }
                  
                  if (!isFormValid) {
                    alert('Please fill in all required fields.');
                    return;
                  }
                  
                  try {
                    console.log('Submitting support request:', {
                      user_id: user.id,
                      name: form.name,
                      account: form.account,
                      category: form.category,
                      message: form.message
                    });
                    
                    const { data, error } = await supabase
                      .from('support_requests')
                      .insert({
                        user_id: user.id,
                        name: form.name,
                        account: form.account,
                        category: form.category,
                        message: form.message,
                        status: 'New',
                        created_at: new Date().toISOString()
                      })
                      .select();
                    
                    if (error) {
                      console.error('Database error:', error);
                      setErrorMessage(`Failed to submit request: ${error.message}`);
                      setShowErrorPopup(true);
                    } else {
                      console.log('Support request submitted successfully:', data);
                      setShowSuccessPopup(true);
                      setForm({ name: '', account: '', category: 'Billing & Payments', message: '' });
                    }
                  } catch (error) {
                    console.error('Unexpected error:', error);
                    setErrorMessage('An unexpected error occurred. Please try again.');
                    setShowErrorPopup(true);
                  }
                }}>
                  <div className="flex flex-col md:flex-row gap-4">
                    <input className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 flex-1" placeholder="Name*" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    <input 
                      className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 flex-1" 
                      placeholder="Account Number*" 
                      value={form.account} 
                      onChange={e => { 
                        let val = e.target.value;
                        // Remove AQB- prefix if user tries to delete it
                        if (val.startsWith('AQB-')) {
                          val = val.substring(4);
                        }
                        // Remove any non-numeric characters
                        val = val.replace(/[^0-9]/g, '');
                        // Add AQB- prefix
                        const finalVal = val ? `AQB-${val}` : '';
                        setForm({ ...form, account: finalVal }); 
                      }} 
                      onFocus={e => {
                        // If field is empty, add AQB- prefix
                        if (!form.account) {
                          setForm({ ...form, account: 'AQB-' });
                        }
                      }}
                      required 
                    />
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <select className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 flex-1" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      <option>Billing & Payments</option>
                      <option>Technical Issue</option>
                      <option>General Inquiry</option>
                      <option>Account Management</option>
                      <option>Service Request</option>
                    </select>
                  </div>
                  <textarea className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[80px] resize-y" placeholder="Message*" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required />
                  <div className="flex justify-center w-full">
                    <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full px-8 py-3 text-lg transition-colors shadow disabled:bg-gray-300 disabled:text-gray-400" type="submit" disabled={!isFormValid}>Submit Request</button>
                  </div>
                </form>
              </motion.div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.03, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)', borderColor: '#3b82f6' }} transition={{ delay: 0.2, duration: 0.5, type: 'spring' }} className="bg-white/40 backdrop-blur-lg p-8 rounded-2xl shadow-lg border border-white/30 md:col-span-2 overflow-x-auto min-h-0 cursor-pointer hover:border-blue-400 transition-all duration-300">
                <div className="mb-8">
                  <div className="text-xl font-semibold mb-4 text-gray-800">Frequently Asked Questions</div>
                  <div className="divide-y divide-gray-200">
                    {faqGroups.map((group, gIdx) => (
                      <div key={gIdx} className="py-2">
                        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setOpenFAQ(openFAQ === gIdx ? null : gIdx)}>
                          <span className={`rounded-full p-1 transition-colors ${openFAQ === gIdx ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>{openFAQ === gIdx ? <RiSubtractFill size={20} /> : <RiAddFill size={20} />}</span>
                          <span className="font-bold text-lg text-gray-800">{group.title}</span>
                        </div>
                        {openFAQ === gIdx && (
                          <div className="mt-3 pl-7 flex flex-col gap-3">
                            {group.questions.map((faq, idx) => (
                              <div key={idx} className="bg-blue-50 rounded-lg p-4 border border-blue-100 shadow-sm">
                                <div className="font-medium text-gray-800 flex items-center gap-2"><RiArrowDownSLine className="text-blue-400" />{faq.q}</div>
                                <div className="mt-1 text-gray-600 text-base">{faq.a}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.03, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)', borderColor: '#3b82f6' }} transition={{ delay: 0.3, duration: 0.5, type: 'spring' }} className="bg-white/40 backdrop-blur-lg p-8 rounded-2xl shadow-lg border border-white/30 flex flex-col gap-8 min-w-[380px] max-w-[600px] w-full break-words cursor-pointer hover:border-blue-400 transition-all duration-300">
                <div>
                  <div className="text-xl font-semibold mb-4 text-gray-800">Contact Information</div>
                  <div className="flex flex-col gap-2 text-gray-700 text-base">
                    <div className="flex items-start gap-2"><RiPhoneLine className="text-blue-500 mt-1" /><div><b>Emergency Contact</b><br /><span className="break-all">+91 9493631925</span></div></div>
                    <div className="flex items-start gap-2"><RiMailLine className="text-blue-500 mt-1" /><div><b>Email Support</b><br /><span className="break-all">subramanyamnani8@gmail.com</span></div></div>
                    <div className="flex items-start gap-2"><RiBook2Line className="text-blue-500 mt-1" /><div><b>Operating Hours</b><br />Mon-Fri: 8am - 6pm</div></div>
                  </div>
                </div>
                <div>
                  <div className="text-xl font-semibold mb-4 text-gray-800">Quick Links</div>
                  <div className="flex flex-col gap-3">
                    <button className="flex items-center gap-2 text-blue-500 hover:text-blue-700 font-medium transition-colors" onClick={() => navigate('/billing')}><RiBillLine /> Pay Your Bill</button>
                    <button className="flex items-center gap-2 text-blue-500 hover:text-blue-700 font-medium transition-colors" onClick={() => navigate('/forms')}><RiDownloadLine /> Download Forms</button>

                    <button className="flex items-center gap-2 text-blue-500 hover:text-blue-700 font-medium transition-colors" onClick={() => navigate('/dashboard')}><RiDashboardLine /> Dashboard Overview</button>

                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
        <footer className="text-center text-gray-200 text-base mt-12 mb-4">© 2024 AquaBill. All rights reserved.</footer>
      </main>
      {chatOpen && <ChatbotModal onClose={() => setChatOpen(false)} />}
      
      {/* Success Popup */}
      {showSuccessPopup && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Request Submitted Successfully!</h3>
            <p className="text-gray-600 mb-6">
              Your support request has been submitted to our admin team. They will review it and respond to you soon. You can track the status in your dashboard.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Error Popup */}
      {showErrorPopup && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Submission Failed</h3>
            <p className="text-gray-600 mb-6">
              {errorMessage}
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setShowErrorPopup(false)}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function ChatbotModal({ onClose }) {
  const [chatMessages, setChatMessages] = useState([
    { from: 'bot', text: 'Hi! I\'m Aqua, your assistant. How can I help you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [botTyping, setBotTyping] = useState(false);
  const chatEndRef = useRef(null);
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, botTyping]);

  function getBotResponse(input) {
    const lower = input.toLowerCase();
    // Billing
    if (lower.includes('bill') && lower.includes('view')) return 'You can view your current and past bills in the Billing section.';
    if (lower.includes('bill') && lower.includes('download')) return 'To download your bill, go to Billing > Billing History and click the Download icon.';
    if (lower.includes('bill') && lower.includes('incorrect')) return 'If your bill seems incorrect, please submit a support request with details.';
    // Payments
    if (lower.includes('payment method')) return 'We accept Credit Card, Bank Transfer, and UPI. You can add or manage payment methods in Billing.';
    if (lower.includes('auto-pay') || lower.includes('automatic payment')) return 'Enable auto-pay in Billing > Payment Methods.';
    if (lower.includes('payment') && lower.includes('status')) return 'You can check your payment status in Billing > Billing History.';
    if (lower.includes('pay') && lower.includes('bill')) return 'To pay your bill, go to the Billing page and click Make Payment.';
    // Account
    if (lower.includes('update') && lower.includes('contact')) return 'Update your contact info in the Profile page.';
    if (lower.includes('forgot') && lower.includes('password')) return 'Use the Forgot Password link on the login page to reset your password.';
    if (lower.includes('change') && lower.includes('email')) return 'Submit a support request to change your email address.';
    // Technical
    if (lower.includes('log in') || lower.includes('login issue')) return 'Check your credentials and internet connection. If the issue persists, try resetting your password or contact support.';
    if (lower.includes('technical issue')) return 'Please describe your technical issue, and I\'ll do my best to help!';
    // Service
    if (lower.includes('leak')) return 'To report a water leak, submit a support request or call our emergency contact.';
    if (lower.includes('new connection') || lower.includes('new service')) return 'To request a new water connection, please submit a support request with your details and our team will assist you.';
    // Greetings
    if (lower.match(/\b(hello|hi|hey|good morning|good afternoon|good evening)\b/)) return 'Hello! How can I assist you today?';
    // General
    if (lower.includes('help')) return 'Sure! You can ask me about billing, payments, account, technical issues, or services.';
    if (lower.includes('faq')) return 'You can find FAQs in the Support page below the chat.';
    if (lower.includes('contact')) return 'You can contact us via the Support Request form or see our contact info in the Support page.';
    // Suggestions
    if (lower.includes('what can you do')) return 'I can answer questions about your water bill, payments, account, and services. Try asking: "How do I pay my bill?" or "How do I report a leak?"';
    // Fallback
    return "I'm not sure I understand. You can ask about bills, payments, account, technical issues, or services. Or type 'help' for suggestions.";
  }

  const handleSendChat = () => {
    if (!chatInput.trim() || botTyping) return;
    setChatMessages(msgs => [...msgs, { from: 'user', text: chatInput }]);
    setBotTyping(true);
    const userInput = chatInput;
    setChatInput('');
    setTimeout(() => {
      setChatMessages(msgs => [...msgs, { from: 'bot', text: getBotResponse(userInput) }]);
      setBotTyping(false);
    }, 1200 + Math.random() * 600);
  };

  // Animations for chat window and messages
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.3 }}
        className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl w-[380px] max-w-[95vw] h-[600px] flex flex-col overflow-hidden border border-white/40">
        <div className="bg-gradient-to-r from-fuchsia-500 to-blue-400 text-white font-bold px-6 py-4 flex items-center justify-between">
          <span className="flex items-center gap-2"><RiChat1Line size={22} /> Chat Assistant</span>
          <button className="text-2xl font-bold hover:text-fuchsia-200 transition-colors" onClick={onClose} aria-label="Close chat">&times;</button>
        </div>
        <div className="flex-1 p-5 overflow-y-auto bg-white/30 flex flex-col gap-2" style={{ maxHeight: '400px' }}>
          {chatMessages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className={`flex items-end gap-2 ${msg.from === 'bot' ? 'self-start' : 'self-end'}`}
            >
              {msg.from === 'bot' && <span className="w-8 h-8 rounded-full bg-fuchsia-200 flex items-center justify-center text-fuchsia-600 font-bold shadow"><RiChat1Line size={20} /></span>}
              <span className={`rounded-2xl px-4 py-2 max-w-[75%] text-base shadow ${msg.from === 'bot' ? 'bg-fuchsia-50 text-fuchsia-700' : 'bg-fuchsia-500 text-white'}`}>{msg.text}</span>
              {msg.from === 'user' && <span className="w-8 h-8 rounded-full bg-fuchsia-500 flex items-center justify-center text-white font-bold shadow">U</span>}
            </motion.div>
          ))}
          {botTyping && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2 self-start">
              <span className="w-8 h-8 rounded-full bg-fuchsia-200 flex items-center justify-center text-fuchsia-600 font-bold shadow"><RiChat1Line size={20} /></span>
              <span className="rounded-2xl px-4 py-2 max-w-[75%] text-base bg-fuchsia-50 text-fuchsia-700 shadow flex items-center gap-1">
                <span>Typing</span>
                <span className="animate-bounce">.</span>
                <span className="animate-bounce delay-100">.</span>
                <span className="animate-bounce delay-200">.</span>
              </span>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="flex items-center gap-2 px-5 py-4 bg-white/0 border-t border-white/30">
          <input
            className="flex-1 bg-gray-100 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSendChat(); }}
            placeholder="Type your message..."
            autoFocus
            aria-label="Type your message"
          />
          <button
            className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold rounded-lg px-5 py-2 transition-colors disabled:bg-fuchsia-200"
            onClick={handleSendChat}
            disabled={!chatInput.trim() || botTyping}
            aria-label="Send message"
          >Send</button>
        </div>
      </motion.div>
    </div>
  );
} 