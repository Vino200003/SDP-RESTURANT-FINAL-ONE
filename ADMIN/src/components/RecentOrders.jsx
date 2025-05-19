import { useState, useEffect } from 'react';
import { getAllOrders } from '../services/orderService';
import '../styles/RecentOrders.css';

function RecentOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchRecentOrders();
  }, []);
  
  const fetchRecentOrders = async () => {
    try {
      setLoading(true);
      // Get only recent orders with a limit of 5
      const response = await getAllOrders({ page: 1, limit: 5 });
      
      if (response && response.orders) {
        setOrders(response.orders);
      } else {
        // Handle case where the API doesn't return expected data
        setOrders([]);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      setError('Failed to load recent orders. API endpoint might not be ready yet.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Format date from ISO string to readable format
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Get status badge class based on order status
  const getStatusClass = (status) => {
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'In Progress': return 'status-processing';
      case 'Pending': return 'status-pending';
      case 'Cancelled': return 'status-cancelled';
      default: return '';
    }
  };
  
  return (
    <div className="recent-orders-card">
      <div className="card-header">
        <h2>Recent Orders</h2>
        <button className="view-all-button" onClick={fetchRecentOrders}>Refresh</button>
      </div>
      
      {loading ? (
        <div className="loading-indicator">Loading recent orders...</div>
      ) : error ? (
        <div className="error-message">
          {error}
          <button onClick={fetchRecentOrders} className="retry-button">Retry</button>
        </div>
      ) : orders.length > 0 ? (
        <table className="orders-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.order_id}>
                <td>{order.order_id}</td>
                <td>{order.first_name} {order.last_name || ''}</td>
                <td>{formatDate(order.created_at)}</td>
                <td>Rs. {parseFloat(order.total_amount).toFixed(2)}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(order.order_status)}`}>
                    {order.order_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="no-orders-message">
          No recent orders found. New orders will appear here.
        </div>
      )}
    </div>
  );
}

export default RecentOrders;
