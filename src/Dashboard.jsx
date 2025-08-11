import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Droplets } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from './supabaseClient';
import { RiDropLine, RiBillLine, RiUserLine, RiTestTubeLine } from 'react-icons/ri';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

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

// Format date as dd/mm/yyyy
function formatDateDMY(dateObj) {
  const d = new Date(dateObj);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper to format month and year
function formatMonthYear(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const gradient = useMemo(() => getRandomGradient(), []);
  const [period, setPeriod] = React.useState('daily');
  const [user, setUser] = useState(null);
  const [usageData, setUsageData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add state for previous bills
  const [previousBills, setPreviousBills] = useState([]);
  // Add state for profile photo
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  
  // Define today and date variables at the top level
  const today = new Date();
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  // Define fetchBills as a function
  const fetchBills = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('bills')
      .select('id, date, amount, status')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(3);
    if (!error && data) {
      setPreviousBills(data);
    }
  };

  useEffect(() => {
    // Fetch user details from Supabase
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        setUser(data.user);
        // Fetch profile photo
        await fetchProfilePhoto(data.user.id);
        // Fetch notifications
        await fetchNotifications();
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

  // Function to fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Function to get response details for a notification
  const getResponseDetails = async (referenceId) => {
    try {
      const { data, error } = await supabase
        .from('support_responses')
        .select(`
          *,
          support_requests:request_id (
            category,
            message
          )
        `)
        .eq('id', referenceId)
        .single();
      
      if (!error && data) {
        return data;
      }
    } catch (error) {
      console.error('Error fetching response details:', error);
    }
    return null;
  };

  // Function to mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (!error) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

    // Fetch flow data for the user
  useEffect(() => {
    async function fetchUsage() {
      if (!user) return;
      try {
        const { data, error } = await supabase
      .from('flow_data')
          .select('flow_rate, liters, timestamp')
        .eq('user_id', user.id)
          .order('timestamp', { ascending: true });
        
        if (error) {
          console.error('Error fetching flow data:', error);
          return;
        }
        
      if (data) {
          console.log('Fetched flow data:', data);
          console.log('Number of records:', data.length);
          if (data.length > 0) {
            console.log('First record:', data[0]);
            console.log('Last record:', data[data.length - 1]);
          }
        setUsageData(data);
        } else {
          console.log('No flow data found for user:', user.id);
        }
      } catch (error) {
        console.error('Error in fetchUsage:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsage();
    
    // Refresh data every 1 second for real-time updates
    const interval = setInterval(() => {
      fetchUsage();
      fetchNotifications(); // Also fetch notifications for real-time updates
    }, 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Cleaned usage data: replace null/undefined flow_rate with 0 and map timestamp to created_at for compatibility
  const cleanedUsageData = usageData.map(d => ({ 
    ...d, 
    flow_rate: d.flow_rate == null ? 0 : d.flow_rate,
    created_at: d.timestamp // Map timestamp to created_at for existing logic
  }));
  
  console.log('Data mapping check:', {
    originalData: usageData.slice(0, 2),
    cleanedData: cleanedUsageData.slice(0, 2),
    today: today.toISOString(),
    thisMonth,
    thisYear
  });

  // Fetch previous bills for the current user
  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line
  }, [user]);

  // Automatically generate a bill for the current month if it does not exist
  useEffect(() => {
    async function ensureCurrentMonthBill() {
      if (!user) return;
      // 1. Check if bill for this month exists
      const { data: existingBills } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1);
      const billExists = existingBills && existingBills[0] &&
        new Date(existingBills[0].date).getMonth() === thisMonth &&
        new Date(existingBills[0].date).getFullYear() === thisYear;
      if (!billExists) {
        // 2. Calculate usage for this month from flow_data
        const { data: flowData } = await supabase
          .from('flow_data')
          .select('total_liters, created_at')
          .eq('user_id', user.id);
        
        const currentMonthTotal = (flowData || [])
          .filter(d => {
            const dt = new Date(d.created_at);
            return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear;
          })
          .reduce((sum, d) => sum + (d.total_liters || 0), 0);
        
        const amount = ((currentMonthTotal / 1000) * 4.5).toFixed(2);
        const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().slice(0, 10);
        // 3. Insert new bill
        await supabase.from('bills').insert([{
          user_id: user.id,
          date: today.toISOString().slice(0, 10),
          amount,
          status: 'Unpaid',
          due_date: dueDate
        }]);
        // 4. Optionally, refresh previous bills
        await fetchBills();
      }
    }
    ensureCurrentMonthBill();
    // eslint-disable-next-line
  }, [user]);

  // Prepare chart data for Chart.js
  let allDates = [];
  let prevPeriodSeries = [];
  let currPeriodSeries = [];


  if (period === 'daily') {
    // Show today's data in 2-hour intervals
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0); // Start of today
    
    // Create 2-hour intervals for 24 hours (12 intervals)
    allDates = [];
    const timeIntervals = [];
    for (let i = 0; i < 12; i++) {
      const startHour = i * 2;
      const endHour = startHour + 2;
      const timeLabel = `${startHour.toString().padStart(2, '0')}:00`;
      allDates.push(timeLabel);
      
      const startTime = new Date(todayStart);
      startTime.setHours(startHour, 0, 0, 0);
      const endTime = new Date(todayStart);
      endTime.setHours(endHour, 0, 0, 0);
      timeIntervals.push({ start: startTime, end: endTime });
    }
    
    // Calculate usage for each 2-hour interval for today (BLUE LINE - Current)
    currPeriodSeries = timeIntervals.map(interval => {
      const intervalData = cleanedUsageData.filter(d => {
        const dt = new Date(d.created_at);
        return dt >= interval.start && dt < interval.end;
      });
      return intervalData.reduce((sum, d) => sum + (d.liters || 0), 0);
    });
    
    // Calculate yesterday's data (July 30th) - if no data exists, it will be all zeros
    const yesterday = new Date(todayStart);
    yesterday.setDate(todayStart.getDate() - 1);
    
    prevPeriodSeries = timeIntervals.map(interval => {
      const intervalStart = new Date(interval.start);
      intervalStart.setDate(yesterday.getDate());
      intervalStart.setMonth(yesterday.getMonth());
      intervalStart.setFullYear(yesterday.getFullYear());
      
      const intervalEnd = new Date(interval.end);
      intervalEnd.setDate(yesterday.getDate());
      intervalEnd.setMonth(yesterday.getMonth());
      intervalEnd.setFullYear(yesterday.getFullYear());
      
      const intervalData = cleanedUsageData.filter(d => {
        const dt = new Date(d.created_at);
        return dt >= intervalStart && dt < intervalEnd;
      });
      return intervalData.reduce((sum, d) => sum + (d.liters || 0), 0);
    });
  } else if (period === 'weekly') {
    // Compare last week vs this week, x-axis is always Mon-Sun
    function getWeekStart(d) {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
      return new Date(date.setDate(diff));
    }
    const thisWeekStart = getWeekStart(today);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    function getWeekDates(start) {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
    }
    const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const lastWeekDates = getWeekDates(lastWeekStart);
    const thisWeekDates = getWeekDates(thisWeekStart);
    allDates = weekDayLabels; // Only one week on x-axis
    
    // Sum liters for each day of the week
    // RED LINE - Previous Week
    prevPeriodSeries = lastWeekDates.map(date => {
      const dayData = cleanedUsageData.filter(d => {
        const dt = new Date(d.created_at);
        return dt.toDateString() === date.toDateString();
      });
      return dayData.reduce((sum, d) => sum + (d.liters || 0), 0);
    });
    // BLUE LINE - Current Week
    currPeriodSeries = thisWeekDates.map(date => {
      const dayData = cleanedUsageData.filter(d => {
        const dt = new Date(d.created_at);
        return dt.toDateString() === date.toDateString();
      });
      return dayData.reduce((sum, d) => sum + (d.liters || 0), 0);
    });
  } else if (period === 'monthly') {
    // Compare last month vs this month, x-axis is always 1-31
    allDates = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
    const lastMonth = (thisMonth - 1 + 12) % 12;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    // Map usage to day of month
    // RED LINE - Previous Month
    const lastMonthData = cleanedUsageData.filter(d => {
      const dt = new Date(d.created_at);
      return dt.getMonth() === lastMonth && dt.getFullYear() === lastMonthYear;
    });
    // BLUE LINE - Current Month
    const thisMonthData = cleanedUsageData.filter(d => {
      const dt = new Date(d.created_at);
      return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear;
    });
    prevPeriodSeries = allDates.map(day => {
      const found = lastMonthData.find(d => {
        const dt = new Date(d.created_at);
        return dt.getDate() === parseInt(day, 10);
      });
      return found ? found.liters : 0;
    });
    currPeriodSeries = allDates.map(day => {
      const found = thisMonthData.find(d => {
        const dt = new Date(d.created_at);
        return dt.getDate() === parseInt(day, 10);
      });
      return found ? found.liters : 0;
    });
  }

  const chartData = {
    labels: allDates,
    datasets: [
      {
        data: prevPeriodSeries,
        fill: true,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 1)',
        pointBackgroundColor: 'rgba(239, 68, 68, 1)',
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
        label: period === 'daily' ? 'Yesterday' : period === 'weekly' ? 'Previous Week' : 'Previous Month'
      },
      {
        data: currPeriodSeries,
        fill: true,
        backgroundColor: 'rgba(87, 181, 231, 0.15)',
        borderColor: 'rgba(87, 181, 231, 1)',
        pointBackgroundColor: 'rgba(87, 181, 231, 1)',
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
        label: period === 'daily' ? 'Today' : period === 'weekly' ? 'Current Week' : 'Current Month'
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    scales: {
      x: {
        title: {
          display: false,
        },
        ticks: {
          color: '#1f2937',
          maxRotation: 45,
          minRotation: 0,
          autoSkip: false,
          maxTicksLimit: period === 'daily' ? 12 : 14,
        },
        grid: {
          display: false,
        },
      },
      y: {
        title: {
          display: true,
          text: 'Liters',
          color: '#1f2937',
        },
        ticks: {
          color: '#1f2937',
        },
        grid: {
          display: false,
        },
      },
    },
  };

  // Calculate current date water usage and amount from flow_data

  // Calculate current date usage by summing liters for the most recent date
  const mostRecentData = cleanedUsageData.length > 0 ? cleanedUsageData[cleanedUsageData.length - 1] : null;
  const mostRecentDate = mostRecentData ? new Date(mostRecentData.created_at) : null;

  const currentDateUsage = cleanedUsageData
      .filter(d => {
      if (!mostRecentDate) return false;
      const dt = new Date(d.created_at);
      return dt.getDate() === mostRecentDate.getDate() && 
             dt.getMonth() === mostRecentDate.getMonth() && 
             dt.getFullYear() === mostRecentDate.getFullYear();
      })
    .reduce((sum, d) => sum + (d.liters || 0), 0);

  // Calculate bill amount based on usage (₹10 per liter)
  const currentDateAmount = (currentDateUsage * 10).toFixed(2);
  
  console.log('Current date usage calculation:', {
    mostRecentDate: mostRecentDate ? mostRecentDate.toISOString() : 'No data',
    totalDataPoints: cleanedUsageData.length,
    sampleDates: cleanedUsageData.slice(0, 3).map(d => d.created_at),
    currentDateUsage,
    currentDateAmount
  });

  // Get water level from flow_data table
  const latestFlowData = cleanedUsageData.length > 0 ? cleanedUsageData[cleanedUsageData.length - 1] : null;
  // Calculate water level percentage based on liters (assuming max capacity is 1000 liters)
  const maxCapacity = 1000; // liters
  const waterLevelPercentage = latestFlowData ? 
    Math.min(Math.round((latestFlowData.liters || 0) / maxCapacity * 100), 100) : 0;
  const lastUpdated = latestFlowData ? formatDateDMY(latestFlowData.created_at) : '00';

  // Calculate due date (1st of next month) and days remaining
  const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const dueDateStr = formatDateDMY(dueDate);
  const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

  // Unusual Water Usage Detection: detect any day with a daily increase of 50% or more compared to the previous day
  let unusualDate = '00';
  let unusualPercent = '00';
  if (cleanedUsageData && cleanedUsageData.length > 1) {
    // Sort by date ascending
    const sorted = [...cleanedUsageData].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev.flow_rate > 0) {
        const percent = ((curr.flow_rate - prev.flow_rate) / prev.flow_rate) * 100;
        if (percent >= 50) {
          unusualDate = formatDateDMY(curr.created_at);
          unusualPercent = percent.toFixed(1) + '%';
        }
      }
    }
  }

  // Glassmorphism + animated gradient background
  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{
        background: gradient,
        transition: 'background 1s cubic-bezier(.4,0,.2,1)',
      }}
    >
      <header className="w-full px-0 py-6 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="w-full max-w-5xl flex items-center justify-between px-6 md:px-10"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/60 shadow-lg backdrop-blur-md">
              <Droplets size={32} className="text-primary" />
            </span>
            <span className="text-3xl font-pacifico text-primary tracking-tight select-none">AquaBill</span>
          </div>
          <nav className="flex-1 flex justify-center">
            <div className="flex gap-2 bg-white/60 backdrop-blur-md rounded-full px-2 py-1 shadow-lg">
              <Link to="/dashboard" className="flex items-center gap-1 px-6 py-2 text-primary bg-blue-50 rounded-full font-medium transition-colors"><i className="ri-dashboard-line" /><span>Dashboard</span></Link>
              <Link to="/billing" className="flex items-center gap-1 px-6 py-2 text-gray-600 hover:text-primary hover:bg-blue-50 rounded-full font-medium transition-colors"><i className="ri-bill-line" /><span>Billing</span></Link>
              <Link to="/support" className="flex items-center gap-1 px-6 py-2 text-gray-600 hover:text-primary hover:bg-blue-50 rounded-full font-medium transition-colors"><i className="ri-customer-service-line" /><span>Support</span></Link>
            </div>
          </nav>
          <div className="flex items-center gap-6">
            <div className="flex items-center bg-white/60 rounded-full px-2 py-2 shadow backdrop-blur-md">
              <Link to="/profile">
                <span 
                  className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center relative overflow-hidden"
                  style={{
                    backgroundImage: profilePhotoUrl ? `url(${profilePhotoUrl})` : 'url(/background.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  <div className={`absolute inset-0 ${profilePhotoUrl ? 'bg-transparent' : 'bg-blue-100/80 backdrop-blur-sm'} flex items-center justify-center`}>
                    {!profilePhotoUrl && <RiUserLine size={32} className="text-primary" />}
                  </div>
                </span>
              </Link>
            </div>
          </div>
        </motion.div>
      </header>
      <main className="flex-1 w-full flex flex-col items-center px-2 md:px-0">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="w-full max-w-5xl mt-6"
        >
          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-white drop-shadow">Welcome, {user?.user_metadata?.first_name || '--'}!</h2>
            <p className="text-gray-100 mt-1">Here's an overview of your water consumption and billing information.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.03, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)', borderColor: '#3b82f6' }}
              transition={{ delay: 0.1, duration: 0.5, type: 'spring' }}
              className="bg-white/40 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/30 hover:border-primary transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Current Date Usage</p>
                  <h3 className="text-3xl font-bold text-gray-800 mt-1">
                    {loading ? '...' : (currentDateUsage || 0).toLocaleString()} <span className="text-lg font-medium">liters</span>
                  </h3>
                </div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5, type: 'spring' }}
                  className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300"
                >
                  <RiDropLine size={28} />
                </motion.div>
              </div>
              <div className="mt-4">
                <span className="text-gray-500 text-sm">Current date <span className="font-medium text-gray-700">{formatDateDMY(today)}</span></span>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.03, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)', borderColor: '#3b82f6' }}
              transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
              className="bg-white/40 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/30 hover:border-primary transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Current Bill</p>
                  <h3 className="text-3xl font-bold text-gray-800 mt-1">
                    ₹{loading ? '...' : currentDateAmount}
                  </h3>
                </div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5, type: 'spring' }}
                  className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300"
                >
                  <RiBillLine size={26} />
                </motion.div>
              </div>
              <div className="mt-4">
                <span className="text-gray-500 text-sm">Due on <span className="font-medium text-gray-700">{dueDateStr}</span></span>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.03, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)', borderColor: '#3b82f6' }}
              transition={{ delay: 0.3, duration: 0.5, type: 'spring' }}
              className="bg-white/40 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/30 hover:border-primary transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Water Level</p>
                  <h3 className="text-4xl font-bold text-gray-800 mt-1">
                    {loading ? '...' : waterLevelPercentage} <span className="text-lg font-medium">%</span>
                  </h3>
                </div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5, type: 'spring' }}
                  className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300"
                >
                  <RiTestTubeLine size={28} />
                </motion.div>
              </div>
              <div className="mt-4">
                <span className="text-gray-500 text-sm">Last updated: <span className="font-medium text-gray-700">{lastUpdated}</span></span>
              </div>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="bg-white/40 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/30 mb-8"
          >
            <div className="flex flex-wrap items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Water Usage History</h3>
              <div className="flex items-center gap-4">
                <div className="bg-gray-100 rounded-full p-1">
                  {['daily', 'weekly', 'monthly'].map(p => (
                    <button
                      key={p}
                      className={`px-4 py-1.5 text-sm rounded-full period-btn ${period === p ? 'bg-white text-primary shadow' : 'text-gray-600'}`}
                      onClick={() => setPeriod(p)}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
                <button
                  className="px-6 py-2 rounded-full font-medium bg-white text-primary border border-primary hover:bg-primary hover:text-white transition-colors duration-200 whitespace-nowrap"
                >
                  <i className="ri-download-line mr-1" /> Export Data
                </button>
              </div>
            </div>
            <div className="w-full" style={{ height: '350px' }}>
              <Line data={chartData} options={chartOptions} style={{ width: '100%', height: '100%' }} />
            </div>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5, type: 'spring' }}
              className="bg-white/40 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/30 hover:border-yellow-400 transition-all duration-300 cursor-pointer col-span-1 md:col-span-2"
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Notifications</h3>
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📬</div>
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`flex items-center gap-4 p-3 rounded border cursor-pointer transition-all hover:shadow-md ${
                        notification.is_read 
                          ? 'bg-gray-50 border-gray-200' 
                          : 'bg-blue-50 border-blue-200'
                      }`}
                      onClick={async () => {
                        if (notification.type === 'support_response') {
                          const responseDetails = await getResponseDetails(notification.reference_id);
                          if (responseDetails) {
                            setSelectedNotification({
                              ...notification,
                              responseDetails
                            });
                            setShowNotificationModal(true);
                            // Mark as read
                            await markNotificationAsRead(notification.id);
                          }
                        }
                      }}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        notification.is_read 
                          ? 'bg-gray-200 text-gray-600' 
                          : 'bg-blue-200 text-blue-600'
                      }`}>
                        {notification.type === 'support_response' ? (
                          <span className="text-lg">💬</span>
                        ) : (
                          <span className="text-lg">📢</span>
                        )}
                  </div>
                      <div className="flex-1">
                        <h4 className={`font-medium ${notification.is_read ? 'text-gray-600' : 'text-gray-800'}`}>
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </p>
                </div>
                      {!notification.is_read && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      )}
                  </div>
                  ))
                )}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5, type: 'spring' }}
              className="bg-white/40 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white/30 hover:border-blue-400 transition-all duration-300 cursor-pointer col-span-1"
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Previous Bills</h3>
              <div className="divide-y divide-gray-200">
                {previousBills.length === 0 ? (
                  <div className="py-3 text-gray-500">No previous bills found.</div>
                ) : (
                  previousBills.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between py-3">
                    <div>
                        <div className="font-medium text-gray-800">{formatMonthYear(bill.date)}</div>
                      <div className="text-sm text-gray-500">{bill.status}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-semibold text-gray-700">₹{Number(bill.amount).toFixed(2)}</div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${bill.status.toLowerCase() === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {bill.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>

      {/* Notification Modal */}
      {showNotificationModal && selectedNotification && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Support Response</h3>
              <button
                onClick={() => {
                  setShowNotificationModal(false);
                  setSelectedNotification(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Original Request */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Your Original Request</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Category:</span>
                    <span className="text-gray-800">{selectedNotification.responseDetails?.support_requests?.category}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Message:</span>
                    <p className="text-gray-800 mt-1 bg-white p-3 rounded border">
                      {selectedNotification.responseDetails?.support_requests?.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin Response */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Admin Response</h4>
                <div className="bg-white p-4 rounded border">
                  <p className="text-gray-800 leading-relaxed">
                    {selectedNotification.responseDetails?.response}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Responded on: {new Date(selectedNotification.responseDetails?.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowNotificationModal(false);
                  setSelectedNotification(null);
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
} 