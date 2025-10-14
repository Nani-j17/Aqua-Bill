import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import razorpayService from './services/razorpayService';
import { RiBankCardLine, RiBankLine, RiAddLine, RiDownloadLine, RiSearchLine, RiArrowDownSLine, RiDashboardLine, RiBillLine, RiCustomerServiceLine, RiUserLine, RiLoader4Line } from 'react-icons/ri';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { subDays, subMonths, subYears } from 'date-fns';

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
        const { data: usage, error: usageError } = await supabase
      .from('flow_data')
            .select('flow_rate, liters, timestamp')
            .eq('user_id', user.id)
            .order('timestamp', { ascending: true });

        if (!usageError) {
                const processedData = (usage || []).map(d => ({
                    ...d,
                    created_at: d.timestamp
                }));
                setChartData(processedData);
            }
        } catch (error) {
        } finally {
            setLoading(false);
        }
    }
    fetchUsageData();
    
    const interval = setInterval(fetchUsageData, 1000);
    return () => clearInterval(interval);
}, [user]);

  const today = new Date();
  const prevMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
  const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  
  // Calculate current month usage
  const currentMonthUsage = chartData
    .filter(d => {
      const dt = new Date(d.created_at);
      return dt.getMonth() === today.getMonth() && dt.getFullYear() === today.getFullYear();
    })
    .reduce((sum, d) => sum + (d.liters || 0), 0);

  // Calculate previous month usage
  const prevMonthUsage = chartData
    .filter(d => {
      const dt = new Date(d.created_at);
      return dt.getMonth() === prevMonth && dt.getFullYear() === prevYear;
    })
    .reduce((sum, d) => sum + (d.liters || 0), 0);

  // Get unpaid previous bills
  const unpaidPreviousBills = allBills
    .filter(bill => bill.status !== 'Paid')
    .reduce((sum, bill) => sum + parseFloat(bill.amount), 0);

  // Current bill = current month usage + unpaid previous bills
  const currentBillAmount = ((currentMonthUsage / 1000) * 4.5) + unpaidPreviousBills;
  
  // Previous month bill amount for display
  const prevMonthBillAmount = ((prevMonthUsage / 1000) * 4.5).toFixed(2);

  const prevMonthData = chartData.filter(d => {
    const dt = new Date(d.created_at);
    return dt.getMonth() === prevMonth && dt.getFullYear() === prevYear;
  });

  const daysInMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
  const chartDataArray = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dayData = prevMonthData.filter(d => {
      const dt = new Date(d.created_at);
      return dt.getDate() === day;
    });
    const usage = dayData.reduce((sum, d) => sum + (d.liters || 0), 0);
    return {
      day,
      usage: usage,
      amount: +(usage * 10).toFixed(2)
    };
  });

  const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  function formatDateDMY(dateObj) {
    const d = new Date(dateObj);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const dueDateStr = formatDateDMY(dueDate);

  useEffect(() => {
      async function fetchAllBills() {
          if (!user) return;
          const { data, error } = await supabase
              .from('bills')
              .select('*')
              .eq('user_id', user.id)
              .order('date', { ascending: false });

          if (!error) {
              setAllBills(data || []);
              // Generate current month bill if it doesn't exist
              await ensureCurrentMonthBill();
          }
      }
      fetchAllBills();
  }, [user]);

  const ensureCurrentMonthBill = async () => {
    if (!user) return;
    
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Check if bill for current month exists
    const { data: existingBills } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1);
      
    const billExists = existingBills && existingBills[0] &&
      new Date(existingBills[0].date).getMonth() === currentMonth &&
      new Date(existingBills[0].date).getFullYear() === currentYear;
      
    if (!billExists) {
      // Calculate current month usage
      const currentMonthUsage = chartData
        .filter(d => {
          const dt = new Date(d.created_at);
          return dt.getMonth() === currentMonth && dt.getFullYear() === currentYear;
        })
        .reduce((sum, d) => sum + (d.liters || 0), 0);
      
      const amount = ((currentMonthUsage / 1000) * 4.5).toFixed(2);
      const dueDate = new Date(currentYear, currentMonth + 1, 1).toISOString().slice(0, 10);
      
      // Generate bill number
      const billNumber = `AB${currentYear}${(currentMonth + 1).toString().padStart(2, '0')}${user.id.substring(0, 4).toUpperCase()}`;
      
      // Insert new bill
      await supabase.from('bills').insert([{
        user_id: user.id,
        bill_number: billNumber,
        date: today.toISOString().slice(0, 10),
        amount,
        status: 'Unpaid',
        due_date: dueDate
      }]);
      
      // Refresh bills list
      const { data: updatedBills } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
        
      if (updatedBills) {
        setAllBills(updatedBills);
      }
    }
  };

  const filteredBills = useMemo(() => {
    let bills = [...allBills];

    if (dateRangeFilter !== 'all') {
        const now = new Date();
        let startDate;
        if (dateRangeFilter === '30d') {
            startDate = subDays(now, 30);
        } else if (dateRangeFilter === '6m') {
            startDate = subMonths(now, 6);
        } else if (dateRangeFilter === '1y') {
            startDate = subYears(now, 1);
        }
        if (startDate) {
            bills = bills.filter(bill => new Date(bill.date) >= startDate);
        }
    }

    if (statusFilter !== 'all') {
        bills = bills.filter(bill => bill.status === statusFilter);
    }

    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        bills = bills.filter(bill =>
            (bill.bill_number && bill.bill_number.toLowerCase().includes(lowercasedQuery)) ||
            (bill.amount && bill.amount.toString().includes(lowercasedQuery)) ||
            (bill.date && bill.date.includes(lowercasedQuery))
        );
    }

    return bills;
}, [allBills, dateRangeFilter, statusFilter, searchQuery]);

useEffect(() => {
    setCurrentPage(1);
}, [dateRangeFilter, statusFilter, searchQuery]);

const totalPages = Math.max(1, Math.ceil(filteredBills.length / billsPerPage));
const indexOfLastBill = currentPage * billsPerPage;
const indexOfFirstBill = indexOfLastBill - billsPerPage;
const currentBills = filteredBills.slice(indexOfFirstBill, indexOfLastBill);

const paginate = (pageNumber) => {
  if (pageNumber >= 1 && pageNumber <= totalPages) {
    setCurrentPage(pageNumber);
  }
};

const handleExport = () => {
    if (filteredBills.length === 0) {
        alert("No data to export.");
        return;
    }
    const headers = ["Date", "Bill Number", "Amount", "Due Date", "Status"];
    const csvContent = [
        headers.join(","),
        ...filteredBills.map(bill => [
            formatDateDMY(bill.date),
            bill.bill_number,
            bill.amount,
            formatDateDMY(bill.due_date || bill.date),
            bill.status
        ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "billing_history.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

  const handleRazorpayPayment = async () => {
    if (!user) {
      setPaymentError('User not authenticated');
      return;
    }

    setPaymentProcessing(true);
    setPaymentError('');

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('mobile, email, full_name')
        .eq('id', user.id)
        .single();

      const userDetails = {
        name: profile?.full_name || user.email?.split('@')[0] || 'User',
        email: profile?.email || user.email,
        contact: profile?.mobile || '9999999999'
      };

      const result = await razorpayService.initiatePayment(
        parseFloat(currentBillAmount),
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
    } else {
      setPaymentError('This payment method is not available yet.');
    }
  };

  const handleCardPayment = (cardData) => {
    setPaymentError('Card payments will be processed through Razorpay for security.');
    setTimeout(() => {
      setPaymentError('');
      handleRazorpayPayment();
    }, 2000);
  };

  const handleAddPaymentMethod = () => {
    setShowAddPaymentModal(true);
  };

  const handleSaveNewPaymentMethod = () => {
    if (newPaymentMethod.cardNumber && newPaymentMethod.cardHolder && newPaymentMethod.expiry && newPaymentMethod.cvv) {
      const newMethod = {
        id: `card_${Date.now()}`,
        name: `${newPaymentMethod.cardHolder}'s Card`,
        type: 'card',
        cardNumber: `****${newPaymentMethod.cardNumber.slice(-4)}`,
        cardHolder: newPaymentMethod.cardHolder,
        isDefault: false
      };
      
      setPaymentMethods(prev => [...prev, newMethod]);
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



  const chartJsData = {
    labels: chartDataArray.map(d => d.day),
    datasets: [
      {
        label: 'Amount (₹)',
        data: chartDataArray.map(d => d.amount),
        fill: true,
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        borderColor: 'rgba(251, 191, 36, 1)',
        pointBackgroundColor: 'rgba(251, 191, 36, 1)',
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: 'Usage (L)',
        data: chartDataArray.map(d => d.usage),
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: 'rgba(59, 130, 246, 1)',
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  const chartJsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
    scales: {
      x: {
        title: { display: true, text: 'Day' },
        grid: { display: false },
      },
      y: {
        title: { display: true, text: 'Liters / Rupees' },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: gradient, transition: 'background 1s cubic-bezier(.4,0,.2,1)' }}>
      <header className="w-full px-0 py-4 md:py-6 flex justify-center">
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }} className="w-full max-w-5xl flex items-center justify-between px-4 md:px-10">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/60 shadow-lg backdrop-blur-md">
              <RiBillLine size={32} className="text-primary" />
            </span>
            <span className="text-2xl md:text-3xl font-pacifico text-primary tracking-tight select-none">AquaBill</span>
          </div>
          <nav className="flex-1 flex justify-center px-2">
            <div className="flex gap-2 bg-white/60 backdrop-blur-md rounded-full px-2 py-1 shadow-lg overflow-x-auto no-scrollbar whitespace-nowrap max-w-full">
              <Link to="/dashboard" className="flex items-center gap-1 px-4 md:px-6 py-2 text-gray-600 hover:text-primary hover:bg-blue-50 rounded-full font-medium transition-colors"><RiDashboardLine /><span>Dashboard</span></Link>
              <Link to="/billing" className="flex items-center gap-1 px-4 md:px-6 py-2 text-primary bg-blue-50 rounded-full font-medium transition-colors"><RiBillLine /><span>Billing</span></Link>
              <Link to="/support" className="flex items-center gap-1 px-4 md:px-6 py-2 text-gray-600 hover:text-primary hover:bg-blue-50 rounded-full font-medium transition-colors"><RiCustomerServiceLine /><span>Support</span></Link>
            </div>
          </nav>
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-center bg-white/60 rounded-full px-2 py-2 shadow backdrop-blur-md">
              <Link to="/profile">
                <span className="w-9 h-9 md:w-14 md:h-14 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
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
            <h2 className="text-2xl md:text-3xl font-semibold text-white drop-shadow">Billing & Payments</h2>
            <p className="text-gray-100 mt-1">Manage your bills, view payment history, and make payments</p>
            
            {paymentSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-green-800 font-medium">Payment successful! Your payment has been processed.</p>
                </div>
              </motion.div>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.03, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)', borderColor: '#3b82f6' }} transition={{ delay: 0.1, duration: 0.5, type: 'spring' }} className="bg-white/40 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/30 hover:border-primary transition-all duration-300 cursor-pointer lg:col-span-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <p className="text-gray-500 text-sm">Current Bill</p>
                  <div className="flex items-baseline">
                      <h3 className="text-3xl md:text-4xl font-bold text-gray-800 mt-1">₹{currentBillAmount.toFixed(2)}</h3>
                      <span className="md:ml-2 text-gray-500">({currentMonthUsage.toFixed(2)} liters)</span>
                  </div>
                    <p className="text-gray-500 text-sm mt-1">Due on <span className="font-medium text-gray-700">{dueDateStr}</span></p>
                  <div className="mt-1 flex items-center">
                    <span className="text-sm text-gray-500">
                      {unpaidPreviousBills > 0 ? (
                        <>Includes ₹{unpaidPreviousBills.toFixed(2)} unpaid previous bills</>
                      ) : (
                        <>Last payment: <span className="font-medium">--</span> on <span className="font-medium">--</span></>
                      )}
                    </span>
                  </div>
                </div>
                <div className="mt-4 md:mt-0">
                  <button
                    onClick={() => setShowPaymentPopup(true)}
                    className="px-5 py-2 rounded-full font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 whitespace-nowrap"
                  >
                    <RiBankCardLine className="mr-2" /> Make Payment
                  </button>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.03, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)', borderColor: '#3b82f6' }} transition={{ delay: 0.2, duration: 0.5, type: 'spring' }} className="bg-white/40 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/30 hover:border-primary transition-all duration-300 cursor-pointer">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Methods</h3>
              <div className="space-y-3">
                <div 
                  onClick={() => handlePaymentMethodSelect('razorpay')}
                  className="border border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 flex items-center justify-between transition-all duration-300 shadow-md cursor-pointer hover:shadow-lg hover:scale-102"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-3 shadow-sm">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="24" height="24" rx="4" fill="#3B82F6"/>
                        <text x="12" y="16" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" fontSize="12" fill="white" textAnchor="middle">RZ</text>
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Razorpay</p>
                      <p className="text-xs text-gray-600">UPI, Cards, Net Banking</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full mb-1">Default</span>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600 font-medium">Active</span>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => handlePaymentMethodSelect('bank')}
                  className="border border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 flex items-center justify-between transition-all duration-300 shadow-md cursor-pointer hover:shadow-lg hover:scale-102"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-600 mr-3 shadow-sm">
                      <RiBankLine size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Bank Account</p>
                      <p className="text-xs text-gray-600">****1234</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full mb-1">Linked</span>
                </div>
                </div>

                {paymentMethods.filter(method => method.type === 'card').map((card) => (
                  <div 
                    key={card.id}
                    onClick={() => handlePaymentMethodSelect('card', card)}
                    className="border border-orange-500 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3 flex items-center justify-between transition-all duration-300 shadow-md cursor-pointer hover:shadow-lg hover:scale-102"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-orange-600 mr-3 shadow-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{card.name}</p>
                        <p className="text-xs text-gray-600">{card.cardNumber}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full mb-1">Card</span>
                    </div>
                  </div>
                ))}

                <div 
                  onClick={handleAddPaymentMethod}
                  className="border border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 flex items-center justify-between transition-all duration-300 shadow-md cursor-pointer hover:shadow-lg hover:scale-102"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-green-600 mr-3 shadow-sm">
                      <RiAddLine size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Add Payment Method</p>
                      <p className="text-xs text-gray-600">Credit/Debit Card</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full mb-1">New</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }} className="bg-white/40 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/30 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
              <h3 className="text-xl font-semibold text-gray-800">Billing History</h3>
              <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
                <div className="relative">
                    <select value={dateRangeFilter} onChange={e => setDateRangeFilter(e.target.value)} className="appearance-none bg-white text-gray-700 py-2 pl-3 pr-8 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary">
                        <option value="all">All Time</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="6m">Last 6 Months</option>
                        <option value="1y">Last Year</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <RiArrowDownSLine />
                  </div>
                </div>
                <div className="relative">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="appearance-none bg-white text-gray-700 py-2 pl-3 pr-8 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary">
                        <option value="all">All Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Unpaid">Unpaid</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <RiArrowDownSLine />
                  </div>
                </div>
                <div className="relative flex-grow md:max-w-xs w-full">
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} type="text" className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Search bills..." />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <RiSearchLine className="text-gray-400" />
                  </div>
                </div>
                <button onClick={handleExport} className="px-6 py-2 rounded-full font-medium bg-white text-primary border border-primary hover:bg-primary hover:text-white transition-colors duration-200 flex items-center gap-2 whitespace-nowrap">
                  <RiDownloadLine /> Export
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {currentBills.map(bill => (
                  <div key={bill.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Bill #{bill.bill_number || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{formatDateDMY(bill.date)}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        bill.status.toLowerCase() === 'paid' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {bill.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Amount</p>
                        <p className="font-medium text-gray-900">₹{bill.amount}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Due Date</p>
                        <p className="font-medium text-gray-900">{formatDateDMY(bill.due_date || bill.date)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button className="text-primary hover:text-blue-700 transition-colors p-1">
                        <RiDownloadLine />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <table className="hidden md:table min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                        {currentBills.map(bill => (
                            <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDateDMY(bill.date)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{bill.bill_number || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">₹{bill.amount}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDateDMY(bill.due_date || bill.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      bill.status.toLowerCase() === 'paid' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {bill.status}
                                    </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button className="text-primary hover:text-blue-700 transition-colors"><RiDownloadLine /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:gap-0 items-center justify-between">
                <div className="text-sm text-gray-500">
                    {filteredBills.length === 0 ? (
                        "No results found"
                    ) : (
                        <>
                    Showing <span className="font-medium">{indexOfFirstBill + 1}</span> to <span className="font-medium">{Math.min(indexOfLastBill, filteredBills.length)}</span> of <span className="font-medium">{filteredBills.length}</span> results
                        </>
                    )}
                </div>
              {filteredBills.length > 0 && (
              <div className="flex items-center space-x-2">
                    <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded-button text-gray-600 hover:text-primary hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Prev
                    </button>
                    {[...Array(totalPages).keys()].map(number => (
                        <button key={number + 1} onClick={() => paginate(number + 1)} className={`px-3 py-1 border rounded-button transition-colors ${currentPage === number + 1 ? 'bg-primary text-white' : 'border-gray-300 text-gray-600 hover:text-primary hover:border-primary'}`}>
                            {number + 1}
                        </button>
                    ))}
                    <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 rounded-button text-gray-600 hover:text-primary hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Next
                    </button>
              </div>
              )}
            </div>
          </motion.div>
          <motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  whileHover={{ scale: 1.03, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)', borderColor: '#3b82f6' }}
  transition={{ delay: 0.4, duration: 0.7, type: 'spring' }}
  className="bg-white/40 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/30 hover:border-primary transition-all duration-300 cursor-pointer mb-8"
>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Previous Month Usage</h3>
    <div className="flex gap-6">
      <div className="flex items-center gap-2">
        <span
          style={{
            display: 'inline-block',
            width: '1.25em',
            height: '1.25em',
            borderRadius: '50%',
            background: 'rgba(251, 191, 36, 1)',
          }}
        />
        <span className="text-gray-700 font-medium">Amount (₹)</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          style={{
            display: 'inline-block',
            width: '1.25em',
            height: '1.25em',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 1)',
          }}
        />
        <span className="text-gray-700 font-medium">Usage (L)</span>
      </div>
    </div>
                </div>
  <div className="relative w-full" style={{ height: '300px', maxHeight: '350px' }}>
    <Line data={chartJsData} options={chartJsOptions} style={{ width: '100%', height: '100%' }} />
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Payment Popup Overlay */}
      {showPaymentPopup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowPaymentPopup(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Select Payment Method</h3>
              <button
                onClick={() => setShowPaymentPopup(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {paymentError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-red-600 text-sm font-medium">{paymentError}</p>
                  </div>
                </div>
              )}
              
              <div 
                onClick={() => handlePaymentMethodSelect('razorpay')}
                className="border-2 border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 flex items-center justify-between transition-all duration-300 shadow-lg cursor-pointer hover:shadow-xl hover:scale-105"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mr-4 shadow-md">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="24" rx="4" fill="#3B82F6"/>
                      <text x="12" y="16" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" fontSize="12" fill="white" textAnchor="middle">RZ</text>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-lg">Razorpay</p>
                    <p className="text-sm text-gray-600">UPI, Cards, Net Banking</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full mb-1">Recommended</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600 font-medium">Secure</span>
                  </div>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between transition-all duration-300 cursor-pointer hover:border-blue-300 hover:bg-blue-50">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-primary mr-3">
                    <RiBankLine size={22} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Bank Account</p>
                    <p className="text-xs text-gray-500">****----</p>
                  </div>
                </div>
              </div>
              
              <button className="w-full mt-4 px-4 py-2 border border-dashed border-gray-300 rounded-xl text-gray-600 hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-2">
                <RiAddLine /> Add Payment Method
              </button>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowPaymentPopup(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handlePaymentMethodSelect('razorpay')}
                disabled={paymentProcessing}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {paymentProcessing ? (
                  <>
                    <RiLoader4Line className="animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  `Pay ₹${currentBillAmount.toFixed(2)}`
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showBankDetailsModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowBankDetailsModal(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Bank Account Details</h3>
              <button
                onClick={() => setShowBankDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <RiBankLine size={24} className="text-blue-600 mr-3" />
                  <h4 className="font-semibold text-gray-800">State Bank of India</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account Number:</span>
                    <span className="font-medium">****1234</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account Type:</span>
                    <span className="font-medium">Savings</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">IFSC Code:</span>
                    <span className="font-medium">SBIN0001234</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Branch:</span>
                    <span className="font-medium">Main Branch</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-yellow-800 text-sm">This account is linked for automatic bill payments.</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={() => setShowBankDetailsModal(false)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showAddPaymentModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddPaymentModal(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Add Payment Method</h3>
              <button
                onClick={() => setShowAddPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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
                  placeholder="1234 5678 9012 3456"
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
                    onChange={(e) => setNewPaymentMethod({...newPaymentMethod, cvv: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    maxLength="4"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowAddPaymentModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveNewPaymentMethod}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                Add Card
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
} 