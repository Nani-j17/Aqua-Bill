import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from './supabaseClient';
import { RiCustomerServiceLine, RiCloseLine, RiSendLine, RiLoader4Line, RiCheckLine } from 'react-icons/ri';

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

export default function Admin() {
  const gradient = React.useMemo(() => getRandomGradient(), []);
  const [user, setUser] = useState(null);
  const [supportRequests, setSupportRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [response, setResponse] = useState('');
  const [sending, setSending] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        window.location.href = '/';
        return;
      }

      const isAdmin = user.email === 'admin@aquabill.com';
      
      if (!isAdmin) {
        window.location.href = '/';
        return;
      }

      setUser(user);

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              role: 'admin',
              created_at: new Date().toISOString()
            });

          if (insertError) {
            setErrorMessage('Failed to create admin profile');
            setShowErrorPopup(true);
            return;
          }
        } else if (profileError) {
          setErrorMessage('Failed to fetch admin profile');
          setShowErrorPopup(true);
          return;
        } else if (profileData && profileData.role !== 'admin') {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', user.id);

          if (updateError) {
            setErrorMessage('Failed to update user role');
            setShowErrorPopup(true);
            return;
          }
        }
      } catch (error) {
        setErrorMessage('Failed to setup admin profile');
        setShowErrorPopup(true);
        return;
      }

      await fetchSupportRequests();
    };

    checkAuth();
  }, []);

  const fetchSupportRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('support_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSupportRequests(data || []);
      setLoading(false);
    } catch (error) {
      setErrorMessage('Failed to fetch support requests');
      setShowErrorPopup(true);
      setLoading(false);
    }
  };

  const sendResponse = async () => {
    if (!response.trim()) {
      setErrorMessage('Please enter a response');
      setShowErrorPopup(true);
      return;
    }

    setSending(true);

    try {
      const { data: responseData, error: responseError } = await supabase
        .from('support_responses')
        .insert({
          support_request_id: selectedRequest.id,
          response: response.trim(),
          admin_id: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (responseError) throw responseError;

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedRequest.user_id,
          title: 'Support Request Response',
          message: `Your support request "${selectedRequest.category}" has received a response from our team.`,
          type: 'support_response',
          reference_id: responseData.id,
          is_read: false,
          created_at: new Date().toISOString()
        });

      if (notificationError) {
        console.error('Failed to create notification:', notificationError);
      }

      const { error: updateError } = await supabase
        .from('support_requests')
        .update({ status: 'Resolved' })
        .eq('id', selectedRequest.id);

      if (updateError) {
        console.error('Failed to update request status:', updateError);
      }

      setResponse('');
      setSelectedRequest(null);
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000);

      await fetchSupportRequests();
    } catch (error) {
      setErrorMessage('Failed to send response');
      setShowErrorPopup(true);
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'new':
        return 'bg-blue-500/20 text-blue-300';
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'resolved':
        return 'bg-green-500/20 text-green-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-500/20 text-red-300';
      case 'high':
        return 'bg-orange-500/20 text-orange-300';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'low':
        return 'bg-green-500/20 text-green-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: gradient }}>
        <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center">
          <RiLoader4Line className="animate-spin text-4xl text-blue-500 mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: gradient, transition: 'background 1s cubic-bezier(.4,0,.2,1)' }}>
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
              <p className="text-blue-100">Manage support requests and user inquiries</p>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/';
              }}
              className="bg-white/20 backdrop-blur-sm text-white px-6 py-2 rounded-lg hover:bg-white/30 transition-all"
            >
              Logout
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Total Requests</h3>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <RiCustomerServiceLine className="text-2xl text-blue-300" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {supportRequests.length}
              </div>
              <p className="text-blue-100 text-sm">All support requests</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">New Requests</h3>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <RiCustomerServiceLine className="text-2xl text-yellow-300" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {supportRequests.filter(req => req.status === 'New').length}
              </div>
              <p className="text-blue-100 text-sm">Pending responses</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Resolved</h3>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <RiCustomerServiceLine className="text-2xl text-green-300" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {supportRequests.filter(req => req.status === 'Resolved').length}
              </div>
              <p className="text-blue-100 text-sm">Completed requests</p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
          >
            <h2 className="text-2xl font-semibold text-white mb-6">Support Requests</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="pb-3 text-white font-semibold">ID</th>
                    <th className="pb-3 text-white font-semibold">User ID</th>
                    <th className="pb-3 text-white font-semibold">Category</th>
                    <th className="pb-3 text-white font-semibold">Subject</th>
                    <th className="pb-3 text-white font-semibold">Priority</th>
                    <th className="pb-3 text-white font-semibold">Status</th>
                    <th className="pb-3 text-white font-semibold">Date</th>
                    <th className="pb-3 text-white font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {supportRequests.map((request) => (
                    <tr key={request.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-3 text-white">#{request.id}</td>
                      <td className="py-3 text-white">{request.user_id}</td>
                      <td className="py-3 text-white">{request.category}</td>
                      <td className="py-3 text-white">{request.subject}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(request.priority)}`}>
                          {request.priority}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="py-3 text-white">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="text-blue-300 hover:text-blue-200 transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Support Request Details</h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <RiCloseLine className="text-2xl" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Request ID</label>
                <p className="text-gray-800 font-medium">#{selectedRequest.id}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                <p className="text-gray-800 font-medium">{selectedRequest.user_id}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <p className="text-gray-800 font-medium">{selectedRequest.category}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <p className="text-gray-800 font-medium">{selectedRequest.subject}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedRequest.message}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(selectedRequest.priority)}`}>
                    {selectedRequest.priority}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                <p className="text-gray-800 font-medium">{selectedRequest.account_number}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Created At</label>
                <p className="text-gray-800 font-medium">
                  {new Date(selectedRequest.created_at).toLocaleString()}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Response</label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="Enter your response to the user..."
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setSelectedRequest(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={sendResponse}
                disabled={sending || !response.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {sending ? (
                  <>
                    <RiLoader4Line className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <RiSendLine />
                    <span>Send Response</span>
                  </>
                )}
              </button>
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
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Response Sent!</h3>
            <p className="text-gray-600 mb-6">
              Your response has been sent successfully to the user.
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