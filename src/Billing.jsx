import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import razorpayService from './services/razorpayService';
import { RiBankCardLine, RiBankLine, RiAddLine, RiDownloadLine, RiSearchLine, RiArrowDownSLine, RiDashboardLine, RiBillLine, RiCustomerServiceLine, RiUserLine, RiLoader4Line } from 'react-icons/ri';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { subDays, subMonths, subYears } from 'date-fns';
import dayjs from 'dayjs';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

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

export default function Billing() {
  const gradient = useMemo(() => getRandomGradient(), []);
  const [user, setUser] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [allBills, setAllBills] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showBankDetailsModal, setShowBankDetailsModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: 'razorpay',
      name: 'Razorpay',
      type: 'gateway',
      description: 'UPI, Cards, Net Banking',
      isDefault: true
    },
    {
      id: 'bank',
      name: 'Bank Account',
      type: 'bank',
      accountNumber: '****1234',
      bankName: 'State Bank of India',
      isDefault: false
    }
  ]);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'card',
    cardNumber: '',
    cardHolder: '',
    expiry: '',
    cvv: ''
  });
  const billsPerPage = 5;

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

  useEffect(() => {
    async function fetchUsageData() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('flow_data')
          .select('flow_rate, liters, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const cleanedData = data.map(item => ({
          ...item,
          created_at: item.created_at || item.timestamp
        }));

        const prevMonth = subMonths(new Date(), 1);
        const prevMonthStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
        const prevMonthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);

        const prevMonthData = cleanedData.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= prevMonthStart && itemDate <= prevMonthEnd;
        });

        const prevMonthUsage = prevMonthData.reduce((sum, item) => sum + (item.liters || 0), 0);
        const prevMonthAmount = prevMonthUsage * 10;

        const chartDataForPrevMonth = prevMonthData.map(item => ({
          date: dayjs(item.created_at).format('DD/MM'),
          usage: item.liters || 0,
          amount: +(prevMonthUsage * 10).toFixed(2)
        }));

        setChartData(chartDataForPrevMonth);
      } catch (error) {
      }
    }

    if (user) {
      fetchUsageData();
      const interval = setInterval(fetchUsageData, 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    async function fetchAllBills() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('bills')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const processedBills = data.map(bill => ({
          ...bill,
          date: bill.created_at ? dayjs(bill.created_at).format('DD/MM/YYYY') : 'N/A',
          dueDate: bill.due_date ? dayjs(bill.due_date).format('DD/MM/YYYY') : 'N/A',
          amount: bill.amount || 0,
          status: bill.status || 'Pending'
        }));

        setAllBills(processedBills);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    }

    if (user) {
      fetchAllBills();
      const interval = setInterval(fetchAllBills, 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const filteredBills = useMemo(() => {
    let filtered = allBills;

    if (dateRangeFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateRangeFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(bill => {
            const billDate = new Date(bill.created_at);
            return billDate >= filterDate;
          });
          break;
        case 'week':
          filterDate.setDate(filterDate.getDate() - 7);
          filtered = filtered.filter(bill => {
            const billDate = new Date(bill.created_at);
            return billDate >= filterDate;
          });
          break;
        case 'month':
          filterDate.setMonth(filterDate.getMonth() - 1);
          filtered = filtered.filter(bill => {
            const billDate = new Date(bill.created_at);
            return billDate >= filterDate;
          });
          break;
        default:
          break;
      }
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(bill => bill.status.toLowerCase() === statusFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(bill =>
        bill.id.toString().includes(lowercasedQuery) ||
        bill.amount.toString().includes(lowercasedQuery) ||
        bill.status.toLowerCase().includes(lowercasedQuery) ||
        (bill.date && bill.date.includes(lowercasedQuery))
      );
    }

    return filtered;
  }, [allBills, dateRangeFilter, statusFilter, searchQuery]);

  const paginatedBills = useMemo(() => {
    const startIndex = (currentPage - 1) * billsPerPage;
    return filteredBills.slice(startIndex, startIndex + billsPerPage);
  }, [filteredBills, currentPage]);

  const totalPages = Math.ceil(filteredBills.length / billsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleExport = () => {
    const csvContent = [
      ['Bill ID', 'Date', 'Amount', 'Status', 'Due Date'],
      ...paginatedBills.map(bill => [
        bill.id,
        bill.date,
        bill.amount,
        bill.status,
        bill.dueDate
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bills_${dayjs().format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleRazorpayPayment = async () => {
    if (!user) return;

    setPaymentProcessing(true);
    setPaymentError('');

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, mobile')
        .eq('id', user.id)
        .single();

      const userDetails = {
        name: profileData ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() : 'User',
        email: user.email,
        contact: profileData?.mobile || '9999999999'
      };

      const result = await razorpayService.initiatePayment(
        parseFloat(prevMonthBillAmount),
        userDetails
      );

      if (result.success) {
        setShowPaymentPopup(false);
        setPaymentProcessing(false);
        setPaymentError('');
        setPaymentSuccess(true);
        setTimeout(() => setPaymentSuccess(false), 3000);
      } else {
        setPaymentError(result.error || 'Payment initiation failed');
        setPaymentProcessing(false);
      }
    } catch (error) {
      setPaymentError(error.message || 'Payment processing failed. Please try again.');
      setPaymentProcessing(false);
    }
  };

  const handlePaymentMethodSelect = (methodId, cardData = null) => {
    if (methodId === 'razorpay') {
      handleRazorpayPayment();
    } else if (methodId === 'bank') {
      setShowBankDetailsModal(true);
    } else if (methodId === 'card' && cardData) {
      handleCardPayment(cardData);
    }
  };

  const handleCardPayment = (cardData) => {
    setShowPaymentPopup(true);
  };

  const handleAddPaymentMethod = () => {
    setShowAddPaymentModal(true);
  };

  const handleSaveNewPaymentMethod = () => {
    if (newPaymentMethod.cardNumber && newPaymentMethod.cardHolder && newPaymentMethod.expiry && newPaymentMethod.cvv) {
      const newCard = {
        id: `card_${Date.now()}`,
        name: `${newPaymentMethod.cardHolder}'s Card`,
        type: 'card',
        cardNumber: `****${newPaymentMethod.cardNumber.slice(-4)}`,
        cardHolder: newPaymentMethod.cardHolder,
        expiry: newPaymentMethod.expiry,
        isDefault: false
      };

      setPaymentMethods(prev => [...prev, newCard]);
      setNewPaymentMethod({
        type: 'card',
        cardNumber: '',
        cardHolder: '',
        expiry: '',
        cvv: ''
      });
      setShowAddPaymentModal(false);
    }
  };

  const prevMonthBillAmount = useMemo(() => {
    const prevMonth = subMonths(new Date(), 1);
    const prevMonthStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
    const prevMonthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);

    const prevMonthBills = allBills.filter(bill => {
      const billDate = new Date(bill.created_at);
      return billDate >= prevMonthStart && billDate <= prevMonthEnd;
    });

    return prevMonthBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  }, [allBills]);

  const chartJsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: '#3B82F6',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#6B7280'
        }
      },
      y: {
        grid: {
          color: 'rgba(107, 114, 128, 0.1)'
        },
        ticks: {
          color: '#6B7280'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const chartDataForDisplay = {
    labels: chartData.map(item => item.date),
    datasets: [
      {
        label: 'Usage (Liters)',
        data: chartData.map(item => item.usage),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      },
      {
        label: 'Amount (₹)',
        data: chartData.map(item => item.amount),
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }
    ]
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: gradient }}>
        <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center">
          <RiLoader4Line className="animate-spin text-4xl text-blue-500 mb-4" />
          <p className="text-gray-600">Loading billing information...</p>
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
              <h1 className="text-3xl font-bold text-white mb-2">Billing & Payments</h1>
              <p className="text-blue-100">Manage your bills and payment methods</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all">
                <RiDashboardLine className="text-xl" />
                <span>Dashboard</span>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Previous Month Usage</h3>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <RiBillLine className="text-2xl text-blue-300" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {chartData.reduce((sum, item) => sum + (item.usage || 0), 0).toFixed(1)} L
              </div>
              <p className="text-blue-100 text-sm">Water consumption last month</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Previous Month Bill</h3>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <RiBankLine className="text-2xl text-yellow-300" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                ₹{prevMonthBillAmount.toFixed(2)}
              </div>
              <p className="text-blue-100 text-sm">Total amount due</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Payment Status</h3>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <RiBankCardLine className="text-2xl text-green-300" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {prevMonthBillAmount > 0 ? 'Pending' : 'Paid'}
              </div>
              <p className="text-blue-100 text-sm">Last payment status</p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Previous Month Usage Chart</h3>
            <div className="h-64">
              <Line data={chartDataForDisplay} options={chartJsOptions} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Payment Methods</h3>
              <button
                onClick={handleAddPaymentMethod}
                className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all"
              >
                <RiAddLine className="text-lg" />
                <span>Add Method</span>
              </button>
            </div>
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  onClick={() => handlePaymentMethodSelect(method.id, method)}
                  className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        {method.type === 'gateway' ? (
                          <div className="text-white font-bold text-sm">RZ</div>
                        ) : method.type === 'bank' ? (
                          <RiBankLine className="text-xl text-blue-300" />
                        ) : (
                          <RiBankCardLine className="text-xl text-blue-300" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{method.name}</h4>
                        <p className="text-blue-100 text-sm">{method.description || method.cardNumber}</p>
                      </div>
                    </div>
                    {method.isDefault && (
                      <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">Active</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Bill History</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <RiSearchLine className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search bills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
                <button
                  onClick={handleExport}
                  className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all"
                >
                  <RiDownloadLine className="text-lg" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="pb-3 text-white font-semibold">Bill ID</th>
                    <th className="pb-3 text-white font-semibold">Date</th>
                    <th className="pb-3 text-white font-semibold">Amount</th>
                    <th className="pb-3 text-white font-semibold">Status</th>
                    <th className="pb-3 text-white font-semibold">Due Date</th>
                    <th className="pb-3 text-white font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBills.map((bill) => (
                    <tr key={bill.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-3 text-white">#{bill.id}</td>
                      <td className="py-3 text-white">{bill.date}</td>
                      <td className="py-3 text-white">₹{bill.amount.toFixed(2)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          bill.status.toLowerCase() === 'paid' 
                            ? 'bg-green-500/20 text-green-300' 
                            : bill.status.toLowerCase() === 'overdue'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="py-3 text-white">{bill.dueDate}</td>
                      <td className="py-3">
                        <button className="text-blue-300 hover:text-blue-200 transition-colors">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-6">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => paginate(page)}
                    className={`px-3 py-2 rounded-lg ${
                      currentPage === page
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </motion.div>

      {showPaymentPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Make Payment</h3>
            <p className="text-gray-600 mb-6">
              You are about to pay ₹{prevMonthBillAmount.toFixed(2)} for your previous month's water bill.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowPaymentPopup(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRazorpayPayment}
                disabled={paymentProcessing}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                {paymentProcessing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <RiLoader4Line className="animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Pay Now'
                )}
              </button>
            </div>
            {paymentError && (
              <p className="text-red-500 text-sm mt-3">{paymentError}</p>
            )}
          </motion.div>
        </div>
      )}

      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Add Payment Method</h3>
              <button
                onClick={() => setShowAddPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                <input
                  type="text"
                  placeholder="4111 1111 1111 1111"
                  value={newPaymentMethod.cardNumber}
                  onChange={(e) => setNewPaymentMethod({...newPaymentMethod, cardNumber: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  maxLength="19"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Card Holder Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={newPaymentMethod.cardHolder}
                  onChange={(e) => setNewPaymentMethod({...newPaymentMethod, cardHolder: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={newPaymentMethod.expiry}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      
                      if (value.length >= 2) {
                        value = value.slice(0, 2) + '/' + value.slice(2);
                      }
                      
                      if (value.length <= 5) {
                        setNewPaymentMethod({...newPaymentMethod, expiry: value});
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    maxLength="5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={newPaymentMethod.cvv}
                    onChange={(e) => setNewPaymentMethod({...newPaymentMethod, cvv: e.target.value.replace(/\D/g, '').slice(0, 3)})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    maxLength="3"
                  />
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewPaymentMethod}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
              >
                Add Card
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showBankDetailsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Bank Account Details</h3>
              <button
                onClick={() => setShowBankDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                <p className="text-gray-800 font-medium">State Bank of India</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                <p className="text-gray-800 font-medium">****1234</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                <p className="text-gray-800 font-medium">SBIN0001234</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                <p className="text-gray-800 font-medium">Main Branch, Mumbai</p>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => setShowBankDetailsModal(false)}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {paymentSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Payment Successful!</h3>
            <p className="text-gray-600 mb-6">
              Your payment of ₹{prevMonthBillAmount.toFixed(2)} has been processed successfully.
            </p>
            <button
              onClick={() => setPaymentSuccess(false)}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
            >
              Got it!
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
} 