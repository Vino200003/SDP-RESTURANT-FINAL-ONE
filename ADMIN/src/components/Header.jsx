import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBell, FaUser, FaSignOutAlt, FaCog } from 'react-icons/fa';
import '../styles/Header.css';
// Import the services needed for notifications
import { getNewOrdersCount } from '../services/orderService';
import { getNewReservationsCount } from '../services/reservationService';

function Header({ title }) {
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [adminInitials, setAdminInitials] = useState('A');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const dropdownRef = useRef(null);

  // Function to fetch notifications from API
  const fetchNotifications = async () => {
    try {
      // Get new orders count
      const ordersResponse = await getNewOrdersCount();
      const newOrdersCount = ordersResponse.count || 0;
      const lastOrderTime = ordersResponse.lastOrderTime || new Date().toISOString();
      
      // Get new reservations count
      const reservationsResponse = await getNewReservationsCount();
      const newReservationsCount = reservationsResponse.count || 0;
      const lastReservationTime = reservationsResponse.lastReservationTime || new Date().toISOString();
      
      // Format timestamps
      const formatTimeAgo = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      };
      
      // Get previously read notification IDs from localStorage
      const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
      
      // Generate notifications based on counts
      const newNotifications = [];
      
      if (newOrdersCount > 0) {
        newNotifications.push({
          id: 1,
          message: `${newOrdersCount} new order${newOrdersCount > 1 ? 's' : ''} received`,
          time: formatTimeAgo(lastOrderTime),
          read: readNotifications.includes(1), // Check if this notification was read before
          count: newOrdersCount,
          type: 'order',
          link: '/orders'
        });
      }
      
      if (newReservationsCount > 0) {
        newNotifications.push({
          id: 2,
          message: `${newReservationsCount} new reservation${newReservationsCount > 1 ? 's' : ''}`,
          time: formatTimeAgo(lastReservationTime),
          read: readNotifications.includes(2), // Check if this notification was read before
          count: newReservationsCount,
          type: 'reservation',
          link: '/reservations'
        });
      }
      
      setNotifications(newNotifications);
      // Only count unread notifications
      setNotificationCount(newNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // If the API fails, show a default notification
      const defaultNotifications = [];
      if (error.message.includes('orders')) {
        defaultNotifications.push({
          id: 1,
          message: 'Unable to fetch new orders',
          time: 'Just now',
          read: false,
          error: true
        });
      }
      if (error.message.includes('reservations')) {
        defaultNotifications.push({
          id: 2,
          message: 'Unable to fetch new reservations',
          time: 'Just now',
          read: false,
          error: true
        });
      }
      setNotifications(defaultNotifications);
    }
  };

  useEffect(() => {
    // Get admin info from local storage
    const adminInfo = localStorage.getItem('adminInfo');
    if (adminInfo) {
      try {
        const admin = JSON.parse(adminInfo);
        
        // Set admin name for display
        if (admin.first_name && admin.last_name) {
          setAdminName(`${admin.first_name} ${admin.last_name}`);
          setAdminInitials(`${admin.first_name[0]}${admin.last_name[0]}`);
        } else if (admin.first_name) {
          setAdminName(admin.first_name);
          setAdminInitials(admin.first_name[0]);
        } else if (admin.email) {
          const emailName = admin.email.split('@')[0];
          setAdminName(emailName);
          setAdminInitials(emailName[0].toUpperCase());
        }
      } catch (error) {
        console.error('Error parsing admin info:', error);
      }
    }
    
    // Initial fetch of notifications
    fetchNotifications();
    
    // Set up interval to fetch notifications every minute
    const intervalId = setInterval(fetchNotifications, 60000);
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  const handleLogout = () => {
    // Clear local storage
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    
    // Redirect to login page
    navigate('/login');
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
    
    // Close notifications dropdown if open
    if (showNotifications) {
      setShowNotifications(false);
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    
    // Close user menu if open
    if (showUserMenu) {
      setShowUserMenu(false);
    }
  };

  // Add a function to mark all notifications as read
  const handleMarkAllAsRead = () => {
    // Create a copy of the current notifications with read=true
    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      read: true
    }));
    
    // Update state
    setNotifications(updatedNotifications);
    setNotificationCount(0);
    
    // Store read status in localStorage
    const notificationIds = updatedNotifications.map(n => n.id);
    const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    const updatedReadNotifications = [...new Set([...readNotifications, ...notificationIds])];
    localStorage.setItem('readNotifications', JSON.stringify(updatedReadNotifications));
    
    // If API is available, also send to server
    try {
      // For each notification type, mark as read on server
      notifications.forEach(notification => {
        if (notification.type === 'order') {
          markOrdersAsRead();
        } else if (notification.type === 'reservation') {
          markReservationsAsRead();
        }
      });
    } catch (error) {
      console.error('Error marking notifications as read on server:', error);
    }
  };

  // Handle clicking a single notification
  const handleNotificationClick = (notificationId) => {
    // Mark this specific notification as read
    const updatedNotifications = notifications.map(notification => 
      notification.id === notificationId ? { ...notification, read: true } : notification
    );
    
    // Update state
    setNotifications(updatedNotifications);
    setNotificationCount(prev => Math.max(0, prev - 1));
    
    // Store read status in localStorage
    const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    if (!readNotifications.includes(notificationId)) {
      readNotifications.push(notificationId);
      localStorage.setItem('readNotifications', JSON.stringify(readNotifications));
    }
    
    // Close notifications dropdown
    setShowNotifications(false);
  };

  const unreadCount = notifications.filter(notification => !notification.read).length;

  return (
    <header className="dashboard-header">
      <h1 className="dashboard-title">{title}</h1>
      
      <div className="header-right">
        <div className="notifications-wrapper" ref={notificationRef}>
          <button 
            className="notifications-button" 
            onClick={toggleNotifications}
            aria-label="Notifications"
          >
            <FaBell />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>
          
          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <h3>Notifications</h3>
                {notifications.length > 0 && (
                  <button className="mark-read-button" onClick={handleMarkAllAsRead}>
                    Mark all as read
                  </button>
                )}
              </div>
              
              <div className="notifications-list">
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <Link 
                      to={notification.link || '#'} 
                      key={notification.id}
                      className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="notification-icon">
                        {notification.type === 'order' ? (
                          <i className="fas fa-shopping-cart"></i>
                        ) : notification.type === 'reservation' ? (
                          <i className="fas fa-calendar-check"></i>
                        ) : (
                          <i className="fas fa-exclamation-circle"></i>
                        )}
                      </div>
                      <div className="notification-content">
                        <p className="notification-message">{notification.message}</p>
                        <p className="notification-time">{notification.time}</p>
                      </div>
                      {!notification.read && (
                        <div className="unread-indicator"></div>
                      )}
                    </Link>
                  ))
                ) : (
                  <div className="no-notifications">
                    <p>No new notifications</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="user-profile-wrapper">
          <div className="user-info" onClick={toggleUserMenu}>
            <div className="user-avatar">
              <span>{adminInitials}</span>
            </div>
            <span className="user-name">{adminName}</span>
          </div>
          
          {showUserMenu && (
            <div className="user-dropdown">
              <Link to="/admin/settings" className="dropdown-item">
                <FaUser />
                <span>Profile</span>
              </Link>
              <Link to="/admin/settings" className="dropdown-item">
                <FaCog />
                <span>Settings</span>
              </Link>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout-button" onClick={handleLogout}>
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
