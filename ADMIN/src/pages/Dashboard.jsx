import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import useApiServices from '../hooks/useApiServices';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import RecentOrders from '../components/RecentOrders';
import RecentReservations from '../components/RecentReservations';
import * as orderService from '../services/orderService';
import * as reservationService from '../services/reservationService';
import '../styles/Dashboard.css';

function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  // State for dashboard stats
  const [stats, setStats] = useState({
    ordersToday: 0,
    revenueToday: 0,
    reservationsToday: 0,
    ordersTrend: 0,
    revenueTrend: 0,
  });
  
  // Initialize API services
  useApiServices();

  // Fetch dashboard stats on component mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        await fetchDashboardStats();
      } catch (error) {
        console.error('Dashboard stats fetch failed:', error);
      } finally {
        // Ensure loading state is cleared even if there are errors
        setIsLoading(false);
      }
    };
    
    fetchStats();
    
    // Set up refresh interval - update stats every 5 minutes
    const intervalId = setInterval(() => {
      fetchStats();
    }, 5 * 60 * 1000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Function to fetch all dashboard stats with improved error handling
  const fetchDashboardStats = async () => {
    setIsLoading(true);
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Initialize with default values
    let todayOrdersData = { total_orders: 0, total_revenue: 0 };
    let yesterdayOrdersData = { total_orders: 0, total_revenue: 0 };
    let reservationsData = { total_reservations: 0 };
    
    // Separate try/catch blocks to prevent one failure from stopping others
    try {
      const response = await orderService.getOrderStats(today, today);
      if (response) todayOrdersData = response;
    } catch (error) {
      console.warn('Error fetching today\'s orders stats, using defaults');
    }
    
    try {
      const response = await orderService.getOrderStats(yesterdayStr, yesterdayStr);
      if (response) yesterdayOrdersData = response;
    } catch (error) {
      console.warn('Error fetching yesterday\'s orders stats, using defaults');
    }
    
    try {
      const response = await reservationService.getReservationStats(today, today);
      if (response) reservationsData = response;
    } catch (error) {
      console.warn('Error fetching reservations stats, using defaults');
    }
    
    // Helper for safe percentage calculation
    const calcPercentChange = (current, previous) => {
      current = parseInt(current) || 0;
      previous = parseInt(previous) || 0;
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };
    
    // Calculate trends with safety checks
    const ordersTrend = calcPercentChange(
      todayOrdersData.total_orders, 
      yesterdayOrdersData.total_orders
    );
    
    const revenueTrend = calcPercentChange(
      todayOrdersData.total_revenue, 
      yesterdayOrdersData.total_revenue
    );
    
    // Update stats state with safe parsing to ensure numeric values
    setStats({
      ordersToday: parseInt(todayOrdersData.total_orders || 0),
      revenueToday: parseFloat(todayOrdersData.total_revenue || 0),
      reservationsToday: parseInt(reservationsData.total_reservations || 0),
      ordersTrend,
      revenueTrend,
    });
    
    setIsLoading(false);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format trend with up/down arrow
  const formatTrend = (value) => {
    if (value > 0) {
      return <span className="positive">↑ {Math.abs(value).toFixed(1)}%</span>;
    } else if (value < 0) {
      return <span className="negative">↓ {Math.abs(value).toFixed(1)}%</span>;
    } else {
      return <span className="neutral">0%</span>;
    }
  };

  // Additional user welcome message showing successful authentication
  const welcomeMessage = user ? `Welcome back, ${user.first_name} ${user.last_name}!` : 'Welcome to the Dashboard!';

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-content">
        <div className="welcome-message">
          <h1>{welcomeMessage}</h1>
          <p>Here's what's happening with your restaurant today</p>
        </div>
        
        <Header title="Dashboard" />
        
        <div className="dashboard-overview">
          <div className="dashboard-welcome">
            <h2>Welcome to Restaurant Admin Dashboard</h2>
            <p>Manage your restaurant operations from this central dashboard</p>
          </div>
          
          <div className="dashboard-stats">
            <div className="stat-card orders">
              <h3>Orders Today</h3>
              <p className="stat-number">{isLoading ? '...' : stats.ordersToday}</p>
              <p className="stat-info">
                {isLoading ? '...' : formatTrend(stats.ordersTrend)} from yesterday
              </p>
            </div>
            
            <div className="stat-card revenue">
              <h3>Today's Revenue</h3>
              <p className="stat-number">
                {isLoading ? '...' : formatCurrency(stats.revenueToday)}
              </p>
              <p className="stat-info">
                {isLoading ? '...' : formatTrend(stats.revenueTrend)} from yesterday
              </p>
            </div>
            
            <div className="stat-card reservations">
              <h3>Reservations</h3>
              <p className="stat-number">{isLoading ? '...' : stats.reservationsToday}</p>
              <p className="stat-info">For today</p>
            </div>
          </div>
        </div>
        
        <div className="dashboard-sections">
          <RecentOrders />
          <RecentReservations />
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
