import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { RiWaterFlashLine, RiBillLine, RiNotificationLine, RiDashboardLine, RiUserLine, RiCustomerServiceLine, RiLoader4Line, RiCloseLine } from 'react-icons/ri';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { subDays, subWeeks, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
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

function formatDateDMY(dateObj) {
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatMonthYear(dateObj) {
  const month = dateObj.toLocaleString('default', { month: 'long' });
  const year = dateObj.getFullYear();
  return `${month} ${year}`;
}

export default function Dashboard() {
  const gradient = useMemo(() => getRandomGradient(), []);
  const [user, setUser] = useState(null);
  const [usageData, setUsageData] = useState([]);
  const [currentMonthUsage, setCurrentMonthUsage] = useState(0);
  const [currentMonthAmount, setCurrentMonthAmount] = useState(0);
  const [waterLevelPercentage, setWaterLevelPercentage] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [chartData, setChartData] = useState({});
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');

  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisYear = new Date(today.getFullYear(), 0, 1);

  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        setUser(data.user);
        await fetchProfilePhoto(data.user.id);
        await fetchNotifications(data.user.id);
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

  const fetchNotifications = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setNotifications(data);
      }
    } catch (error) {
    }
  };

  const getResponseDetails = async (notificationId) => {
    try {
      const { data, error } = await supabase
        .from('support_responses')
        .select('*')
        .eq('notification_id', notificationId)
        .single();

      if (!error && data) {
        return data;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (!error) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        );
      }
    } catch (error) {
    }
  };

  useEffect(() => {
    async function fetchUsage() {
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

        setUsageData(cleanedData);

        const currentMonthData = cleanedData.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= thisMonth && itemDate <= today;
        });

        const totalUsage = currentMonthData.reduce((sum, item) => sum + (item.liters || 0), 0);
        const totalAmount = totalUsage * 10;

        setCurrentMonthUsage(totalUsage);
        setCurrentMonthAmount(totalAmount);

        const maxCapacity = 1000;
        const currentLevel = Math.min((totalUsage / maxCapacity) * 100, 100);
        setWaterLevelPercentage(currentLevel);

        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    }

    if (user) {
      fetchUsage();
      const interval = setInterval(fetchUsage, 1000);
      const notificationInterval = setInterval(() => {
        if (user) fetchNotifications(user.id);
      }, 1000);
      return () => {
        clearInterval(interval);
        clearInterval(notificationInterval);
      };
    }
  }, [user]);

  const mostRecentData = usageData.length > 0 ? usageData[usageData.length - 1] : null;
  const mostRecentDate = mostRecentData ? new Date(mostRecentData.created_at) : null;

  const currentDateUsage = usageData
    .filter(d => {
      if (!mostRecentDate) return false;
      const dt = new Date(d.created_at);
      return dt.getDate() === mostRecentDate.getDate() &&
             dt.getMonth() === mostRecentDate.getMonth() &&
             dt.getFullYear() === mostRecentDate.getFullYear();
    })
    .reduce((sum, d) => sum + (d.liters || 0), 0);

  const currentDateAmount = currentDateUsage * 10;

  useEffect(() => {
    if (usageData.length === 0) return;

    let chartDataForPeriod = {};

    switch (selectedPeriod) {
      case 'daily':
        const today = new Date();
        const yesterday = subDays(today, 1);
        
        const todayData = usageData.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate.getDate() === today.getDate() &&
                 itemDate.getMonth() === today.getMonth() &&
                 itemDate.getFullYear() === today.getFullYear();
        });

        const yesterdayData = usageData.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate.getDate() === yesterday.getDate() &&
                 itemDate.getMonth() === yesterday.getMonth() &&
                 itemDate.getFullYear() === yesterday.getFullYear();
        });

        const timeSlots = [];
        for (let i = 0; i < 24; i += 2) {
          timeSlots.push(`${i.toString().padStart(2, '0')}:00`);
        }

        const todayUsageByHour = timeSlots.map(time => {
          const hour = parseInt(time.split(':')[0]);
          const hourData = todayData.filter(item => {
            const itemHour = new Date(item.created_at).getHours();
            return itemHour >= hour && itemHour < hour + 2;
          });
          return hourData.reduce((sum, item) => sum + (item.liters || 0), 0);
        });

        const yesterdayUsageByHour = timeSlots.map(time => {
          const hour = parseInt(time.split(':')[0]);
          const hourData = yesterdayData.filter(item => {
            const itemHour = new Date(item.created_at).getHours();
            return itemHour >= hour && itemHour < hour + 2;
          });
          return hourData.reduce((sum, item) => sum + (item.liters || 0), 0);
        });

        chartDataForPeriod = {
          labels: timeSlots,
          datasets: [
            {
              label: 'Yesterday',
              data: yesterdayUsageByHour,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 2,
              fill: false,
              tension: 0.4
            },
            {
              label: 'Today',
              data: todayUsageByHour,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              fill: false,
              tension: 0.4
            }
          ]
        };
        break;

      case 'weekly':
        const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
        const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
        const previousWeekStart = subWeeks(currentWeekStart, 1);
        const previousWeekEnd = subWeeks(currentWeekEnd, 1);

        const currentWeekData = usageData.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= currentWeekStart && itemDate <= currentWeekEnd;
        });

        const previousWeekData = usageData.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= previousWeekStart && itemDate <= previousWeekEnd;
        });

        const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const currentWeekUsage = weekDays.map((day, index) => {
          const dayData = currentWeekData.filter(item => {
            const itemDate = new Date(item.created_at);
            const dayOfWeek = itemDate.getDay();
            return dayOfWeek === (index + 1) % 7;
          });
          return dayData.reduce((sum, item) => sum + (item.liters || 0), 0);
        });

        const previousWeekUsage = weekDays.map((day, index) => {
          const dayData = previousWeekData.filter(item => {
            const itemDate = new Date(item.created_at);
            const dayOfWeek = itemDate.getDay();
            return dayOfWeek === (index + 1) % 7;
          });
          return dayData.reduce((sum, item) => sum + (item.liters || 0), 0);
        });

        chartDataForPeriod = {
          labels: weekDays,
          datasets: [
            {
              label: 'Previous Week',
              data: previousWeekUsage,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 2,
              fill: false,
              tension: 0.4
            },
            {
              label: 'Current Week',
              data: currentWeekUsage,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              fill: false,
              tension: 0.4
            }
          ]
        };
        break;

      case 'monthly':
        const currentMonthStart = startOfMonth(today);
        const currentMonthEnd = endOfMonth(today);
        const previousMonthStart = subMonths(currentMonthStart, 1);
        const previousMonthEnd = subMonths(currentMonthEnd, 1);

        const currentMonthData = usageData.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= currentMonthStart && itemDate <= currentMonthEnd;
        });

        const previousMonthData = usageData.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= previousMonthStart && itemDate <= previousMonthEnd;
        });

        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const currentMonthUsageByDay = monthDays.map(day => {
          const dayData = currentMonthData.filter(item => {
            const itemDate = new Date(item.created_at);
            return itemDate.getDate() === day;
          });
          return dayData.reduce((sum, item) => sum + (item.liters || 0), 0);
        });

        const previousMonthUsageByDay = monthDays.map(day => {
          const dayData = previousMonthData.filter(item => {
            const itemDate = new Date(item.created_at);
            return itemDate.getDate() === day;
          });
          return dayData.reduce((sum, item) => sum + (item.liters || 0), 0);
        });

        chartDataForPeriod = {
          labels: monthDays.map(day => day.toString()),
          datasets: [
            {
              label: 'Previous Month',
              data: previousMonthUsageByDay,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 2,
              fill: false,
              tension: 0.4
            },
            {
              label: 'Current Month',
              data: currentMonthUsageByDay,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              fill: false,
              tension: 0.4
            }
          ]
        };
        break;

      default:
        break;
    }

    setChartData(chartDataForPeriod);
  }, [usageData, selectedPeriod]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: 'white',
          usePointStyle: true
        }
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
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'white'
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'white'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: gradient }}>
        <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center">
          <RiLoader4Line className="animate-spin text-4xl text-blue-500 mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
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
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-blue-100">Welcome back! Here's your water usage overview</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setShowNotificationModal(true)}
                  className="relative p-2 text-white hover:bg-white/20 rounded-lg transition-all"
                >
                  <RiNotificationLine className="text-2xl" />
                  {notifications.filter(n => !n.is_read).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {notifications.filter(n => !n.is_read).length}
                    </span>
                  )}
                </button>
              </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Current Date Usage</h3>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <RiWaterFlashLine className="text-2xl text-blue-300" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {currentDateUsage.toFixed(1)} L
              </div>
              <p className="text-blue-100 text-sm">
                {mostRecentDate ? formatDateDMY(mostRecentDate) : 'No data'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Current Date Amount</h3>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <RiBillLine className="text-2xl text-green-300" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                ₹{currentDateAmount.toFixed(2)}
              </div>
              <p className="text-blue-100 text-sm">
                {mostRecentDate ? formatDateDMY(mostRecentDate) : 'No data'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Water Level</h3>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <RiWaterFlashLine className="text-2xl text-purple-300" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {waterLevelPercentage.toFixed(1)}%
              </div>
              <p className="text-blue-100 text-sm">
                {mostRecentDate ? formatDateDMY(mostRecentDate) : 'No data'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <RiNotificationLine className="text-2xl text-yellow-300" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {notifications.filter(n => !n.is_read).length}
              </div>
              <p className="text-blue-100 text-sm">Unread messages</p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Usage Analytics</h3>
                <div className="flex space-x-2">
                  {['daily', 'weekly', 'monthly'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                        selectedPeriod === period
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-64">
                {chartData.labels && chartData.labels.length > 0 ? (
                  <Line data={chartData} options={chartOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-white/60">
                    No data available for selected period
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
            >
              <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  to="/billing"
                  className="flex items-center space-x-3 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                >
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <RiBillLine className="text-xl text-blue-300" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">View Bills</h4>
                    <p className="text-blue-100 text-sm">Check your billing history</p>
                  </div>
                </Link>
                <Link
                  to="/support"
                  className="flex items-center space-x-3 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                >
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <RiCustomerServiceLine className="text-xl text-green-300" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Support</h4>
                    <p className="text-blue-100 text-sm">Get help and support</p>
                  </div>
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center space-x-3 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                >
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <RiUserLine className="text-xl text-purple-300" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Profile</h4>
                    <p className="text-blue-100 text-sm">Manage your account</p>
                  </div>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Notifications</h3>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <RiCloseLine className="text-2xl" />
              </button>
            </div>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No notifications</p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={async () => {
                      if (!notification.is_read) {
                        await markNotificationAsRead(notification.id);
                      }
                      if (notification.type === 'support_response') {
                        const responseDetails = await getResponseDetails(notification.id);
                        setSelectedNotification({ ...notification, responseDetails });
                      } else {
                        setSelectedNotification(notification);
                      }
                    }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      notification.is_read
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">{notification.title}</h4>
                        <p className="text-gray-600 text-sm">{notification.message}</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {dayjs(notification.created_at).format('DD/MM/YYYY HH:mm')}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}

      {selectedNotification && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">{selectedNotification.title}</h3>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <RiCloseLine className="text-2xl" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">{selectedNotification.message}</p>
              {selectedNotification.responseDetails && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Response:</h4>
                  <p className="text-gray-600">{selectedNotification.responseDetails.response}</p>
                </div>
              )}
              <p className="text-gray-400 text-sm">
                {dayjs(selectedNotification.created_at).format('DD/MM/YYYY HH:mm')}
              </p>
            </div>
            <div className="mt-6">
              <button
                onClick={() => setSelectedNotification(null)}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
} 