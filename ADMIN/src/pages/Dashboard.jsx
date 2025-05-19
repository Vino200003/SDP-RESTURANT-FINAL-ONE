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
    ordersTrend: 0, // percentage change from yesterday
    revenueTrend: 0, // percentage change from yesterday
  });
  
  // Initialize API services
  useApiServices();

  // Fetch dashboard stats on component mount
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Function to fetch all dashboard stats
  const fetchDashboardStats = async () => {
    setIsLoading(true);
    
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      // Fetch today's orders
      const todayOrdersData = await orderService.getOrderStats(today, today);
      
      // Fetch yesterday's orders for comparison
      const yesterdayOrdersData = await orderService.getOrderStats(yesterdayStr, yesterdayStr);
      
      // Fetch today's reservations
      const reservationsData = await reservationService.getReservationStats(today, today);
      
      // Calculate percentage changes (avoid division by zero)
      const ordersTrend = yesterdayOrdersData.total_orders > 0 
        ? ((todayOrdersData.total_orders - yesterdayOrdersData.total_orders) / yesterdayOrdersData.total_orders) * 100 
        : 0;
        
      const revenueTrend = yesterdayOrdersData.total_revenue > 0 
        ? ((todayOrdersData.total_revenue - yesterdayOrdersData.total_revenue) / yesterdayOrdersData.total_revenue) * 100 
        : 0;
      
      // Update stats state
      setStats({
        ordersToday: todayOrdersData.total_orders || 0,
        revenueToday: todayOrdersData.total_revenue || 0,
        reservationsToday: reservationsData.total_reservations || 0,
        ordersTrend: ordersTrend,
        revenueTrend: revenueTrend,
      });
      
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Keep default values in case of error
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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
