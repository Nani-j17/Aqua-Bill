import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from './supabaseClient';
import { 
  RiCustomerServiceLine, 
  RiUserLine,
  RiTimeLine, 
  RiCheckLine, 
  RiCloseLine, 
  RiSearchLine, 
  RiFilterLine,
  RiSendPlaneLine,
  RiEyeLine,
  RiRefreshLine
} from 'react-icons/ri';

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

const statusColors = {
  'New': 'bg-blue-100 text-blue-800 border-blue-200',
  'In Progress': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Resolved': 'bg-green-100 text-green-800 border-green-200',
  'Closed': 'bg-gray-100 text-gray-800 border-gray-200'
};

const priorityColors = {
  'Low': 'bg-gray-100 text-gray-800',
  'Medium': 'bg-yellow-100 text-yellow-800',
  'High': 'bg-orange-100 text-orange-800',
  'Urgent': 'bg-red-100 text-red-800'
};

export default function Admin() {
  const gradient = React.useMemo(() => getRandomGradient(), []);
  const [supportRequests, setSupportRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [response, setResponse] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [previousResponses, setPreviousResponses] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAuth();
  }, []);



  const checkAdminAuth = async () => {
    try {
      console.log('Starting admin auth check...');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      console.log('User data:', user);
      console.log('User error:', userError);
      
      if (userError || !user) {
        console.log('No user found, redirecting to login');
        navigate('/');
        return;
      }

      console.log('Checking admin access for user:', user.email);
      
      // Check if user is admin by email (simplified check)
      const isAdmin = user.email === 'admin@aquabill.com';
      
      console.log('Is admin?', isAdmin);
      
      if (!isAdmin) {
        console.log('Not admin, redirecting to login');
        navigate('/');
        return;
      }

      // Ensure admin user has proper role in profiles table
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profileData) {
          // Create or update admin profile
          console.log('Creating/updating admin profile...');
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email,
              role: 'admin',
              updated_at: new Date().toISOString()
            });

          if (upsertError) {
            console.error('Error updating admin profile:', upsertError);
          }
        } else if (profileData.role !== 'admin') {
          // Update role to admin
          console.log('Updating user role to admin...');
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', user.id);

          if (updateError) {
            console.error('Error updating role:', updateError);
          }
        }
      } catch (profileErr) {
        console.error('Profile check/update error:', profileErr);
      }

      console.log('Admin access granted, setting up dashboard...');
      setUser(user);
      setIsAdmin(true);
      setCheckingAuth(false);
      await fetchSupportRequests();
    } catch (error) {
      console.error('Auth check error:', error);
      // Don't redirect on error, just show loading
      setCheckingAuth(false);
    }
  };





  const fetchSupportRequests = async () => {
    try {
      setLoading(true);
      console.log('Fetching support requests...');
      
      // Fetch support requests without complex joins to avoid relationship issues
      console.log('Current user:', user);
      console.log('User email:', user?.email);
      
      const { data, error } = await supabase
        .from('support_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching support requests:', error);
        if (error.message.includes('relation "support_requests" does not exist')) {
          alert('Support requests table does not exist. Please run the SQL script in your Supabase database first.');
        } else {
          alert(`Error fetching requests: ${error.message}`);
        }
      } else {
        console.log('Support requests fetched:', data);
        setSupportRequests(data || []);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred while fetching requests.');
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId, newStatus) => {
    try {
      const { error } = await supabase
        .from('support_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) {
        console.error('Error updating status:', error);
      } else {
        fetchSupportRequests();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const sendResponse = async () => {
    if (!selectedRequest || !response.trim()) return;

    try {
      // Insert the response
      const { data: responseData, error: responseError } = await supabase
        .from('support_responses')
        .insert({
          request_id: selectedRequest.id,
          admin_id: user.id,
          response: response.trim(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (responseError) {
        console.error('Error sending response:', responseError);
        setErrorMessage('Failed to send response. Please try again.');
        setShowErrorPopup(true);
        return;
      }

      // Create notification for the user
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
        console.error('Error creating notification:', notificationError);
      }

      // Update the request status to "Resolved"
      await updateRequestStatus(selectedRequest.id, 'Resolved');
      
      setResponse('');
      setSelectedRequest(null);
      fetchSupportRequests();
      
      setShowSuccessPopup(true);
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('An error occurred while sending the response.');
      setShowErrorPopup(true);
    }
  };

  const filteredRequests = supportRequests.filter(request => {
    const matchesFilter = filter === 'all' || request.status === filter;
    const matchesSearch = 
      request.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: supportRequests.length,
    new: supportRequests.filter(r => r.status === 'New').length,
    resolved: supportRequests.filter(r => r.status === 'Resolved').length
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Function to fetch previous responses for a request
  const fetchPreviousResponses = async (requestId) => {
    try {
      const { data, error } = await supabase
        .from('support_responses')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setPreviousResponses(data);
      }
    } catch (error) {
      console.error('Error fetching previous responses:', error);
    }
  };

  // Show loading while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: gradient, transition: 'background 1s cubic-bezier(.4,0,.2,1)' }}>
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Checking admin access...</p>
        </div>
      </div>
    );
  }

  // Show admin dashboard only if authenticated and is admin
  if (!isAdmin) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: gradient, transition: 'background 1s cubic-bezier(.4,0,.2,1)' }}>
      <header className="w-full px-0 py-6 flex justify-center">
        <motion.div 
          initial={{ opacity: 0, y: -30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.7, ease: 'easeOut' }} 
          className="w-full max-w-7xl flex items-center justify-between px-6 md:px-10"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/60 shadow-lg backdrop-blur-md">
              <RiCustomerServiceLine size={32} className="text-primary" />
            </span>
            <span className="text-3xl font-pacifico text-primary tracking-tight select-none">AquaBill Admin</span>
          </div>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/');
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            Logout
          </button>
        </motion.div>
      </header>

      <main className="flex-1 w-full flex flex-col items-center px-2 md:px-0">
        <motion.div 
          initial={{ opacity: 0, y: 40 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, ease: 'easeOut' }} 
          className="w-full max-w-7xl mt-6"
        >
          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-white drop-shadow text-center">Support Request Management</h2>
            <p className="text-gray-100 mt-1 text-center">Manage and respond to customer support requests</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1 }}
              className="bg-white/40 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/30"
            >
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-gray-100">Total Requests</div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }}
              className="bg-blue-500/40 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-blue-300/30"
            >
              <div className="text-2xl font-bold text-white">{stats.new}</div>
              <div className="text-gray-100">New Requests</div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3 }}
              className="bg-green-500/40 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-green-300/30"
            >
              <div className="text-2xl font-bold text-white">{stats.resolved}</div>
              <div className="text-gray-100">Resolved</div>
            </motion.div>
          </div>

          {/* Filters and Search */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.6 }}
            className="bg-white/40 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/30 mb-8"
          >
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <RiFilterLine className="text-white" />
                  <select 
                    value={filter} 
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-white/80 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="all">All Requests</option>
                    <option value="New">New Requests</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RiSearchLine className="text-white" />
                <input 
                  type="text"
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/80 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 w-64"
                />
              </div>
              <button 
                onClick={fetchSupportRequests}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <RiRefreshLine />
                Refresh
              </button>
            </div>
          </motion.div>

          {/* Support Requests List */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.7 }}
            className="bg-white/40 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 overflow-hidden"
          >
            {loading ? (
              <div className="p-8 text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                <p className="mt-4">Loading support requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-8 text-center text-white">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-xl font-semibold mb-2">No Support Requests Yet</p>
                <p className="text-gray-200">When users submit requests, they'll appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/20">
                    <tr>
                      <th className="px-6 py-4 text-left text-white font-semibold">User</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Category</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Message</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Status</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Date</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20">
                    {filteredRequests.map((request, index) => (
                      <motion.tr 
                        key={request.id} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="hover:bg-white/10 transition-all duration-300 hover:scale-[1.01]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg">
                              {request.profiles?.profile_photo_url ? (
                                <img 
                                  src={request.profiles.profile_photo_url} 
                                  alt="Profile" 
                                  className="w-full h-full rounded-full object-cover border-2 border-white"
                                />
                              ) : (
                                <RiUserLine className="text-white text-xl" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-white text-lg">{request.name}</div>
                              <div className="text-sm text-gray-200">User ID: {request.user_id?.substring(0, 8)}...</div>
                              <div className="text-xs text-gray-300">Account: {request.account}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
                            {request.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <div className="font-medium text-white text-sm leading-relaxed">
                              {request.message.length > 60 
                                ? `${request.message.substring(0, 60)}...` 
                                : request.message
                              }
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-4 py-2 rounded-full text-sm font-medium border-2 shadow-lg ${
                            request.status === 'New' 
                              ? 'bg-red-500/20 text-red-200 border-red-400' 
                              : request.status === 'Resolved'
                              ? 'bg-green-500/20 text-green-200 border-green-400'
                              : 'bg-gray-500/20 text-gray-200 border-gray-400'
                          }`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white">
                          <div className="text-sm font-medium">{formatDate(request.created_at)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={async () => {
                                setSelectedRequest(request);
                                await fetchPreviousResponses(request.id);
                              }}
                              className="p-3 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 hover:text-blue-200 rounded-lg transition-all duration-300 border border-blue-400/30"
                              title="View Details"
                            >
                              <RiEyeLine size={20} />
                            </motion.button>
                            {request.status === 'New' && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => updateRequestStatus(request.id, 'Resolved')}
                                className="p-3 bg-green-500/20 hover:bg-green-500/40 text-green-300 hover:text-green-200 rounded-lg transition-all duration-300 border border-green-400/30"
                                title="Mark Resolved"
                              >
                                <RiCheckLine size={20} />
                              </motion.button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>

      {/* Response Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Respond to Support Request</h3>
                <button 
                  onClick={() => {
                    setSelectedRequest(null);
                    setPreviousResponses([]);
                  }}
                  className="text-2xl hover:text-gray-200 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-4 text-xl">Request Details</h4>
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200 shadow-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">👤 From:</span>
                        <div className="text-gray-800 font-medium">{selectedRequest.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">👤 User ID:</span>
                        <div className="text-gray-800 font-medium">{selectedRequest.user_id}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">🏷️ Category:</span>
                        <div className="text-gray-800 font-medium">{selectedRequest.category}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">🔢 Account:</span>
                        <div className="text-gray-800 font-medium">{selectedRequest.account}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-semibold text-gray-700">💬 Message:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        selectedRequest.status === 'New' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {selectedRequest.status}
                      </span>
                    </div>
                    <div className="text-gray-800 bg-white p-4 rounded-lg border border-gray-200 shadow-sm leading-relaxed">
                      {selectedRequest.message}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Previous Responses Section */}
              {previousResponses.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3">Previous Responses</h4>
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {previousResponses.map((prevResponse, index) => (
                      <div key={prevResponse.id} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-700">Response #{index + 1}</span>
                          <span className="text-xs text-gray-500">{formatDate(prevResponse.created_at)}</span>
                        </div>
                        <p className="text-gray-800 text-sm leading-relaxed">{prevResponse.response}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="block font-semibold text-gray-800 mb-2">Your Response</label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response to the user..."
                  className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setPreviousResponses([]);
                }}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendResponse}
                disabled={!response.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <RiSendPlaneLine />
                Send Response
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Response Sent!</h3>
            <p className="text-gray-600 mb-6">
              Your response has been sent successfully. The user will be notified and can view your response in their dashboard.
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
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Response Failed</h3>
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