import { API_URL } from '../config/constants';

// Get all orders with optional filters
export const getAllOrders = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = '',
      orderType = '',
      kitchenStatus = '', // Add kitchen status
      startDate = '',
      endDate = ''
    } = filters;

    let url = `${API_URL}/api/admin/orders?page=${page}&limit=${limit}`;
    
    if (status) url += `&status=${status}`;
    if (orderType) url += `&type=${orderType}`;
    if (kitchenStatus) url += `&kitchenStatus=${kitchenStatus}`; // Add to URL if present
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    // Get admin token from localStorage
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      console.error('Authentication required for fetching orders');
      return { orders: [], pagination: { page: 1, limit: params.limit || 10, total: 0, pages: 1 } };
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // If API endpoint doesn't exist yet (404) or other error, return empty data
    if (!response.ok) {
      console.warn(`API response not OK: ${response.status} ${response.statusText}`);
      return { orders: [], pagination: { page: 1, limit: params.limit || 10, total: 0, pages: 1 } };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Order service error:', error);
    // Return empty data structure on error
    return { orders: [], pagination: { page: 1, limit: params.limit || 10, total: 0, pages: 1 } };
  }
};

// Get order stats
export const getOrderStats = async (startDate = '', endDate = '') => {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    
    const queryString = queryParams.toString();
    
    // Get admin token from localStorage
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/api/admin/orders/stats${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch order stats');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Order stats service error:', error);
    throw error;
  }
};

// Get a single order by ID
export const getOrderById = async (orderId) => {
  try {
    // Get admin token from localStorage
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/api/admin/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch order details');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get order service error:', error);
    throw error;
  }
};

// Update order status
export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    // Get admin token from localStorage
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update order status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Update order status service error:', error);
    throw error;
  }
};

// Get count of new orders that need attention
export const getNewOrdersCount = async () => {
  try {
    const token = localStorage.getItem('adminToken');
    
    const response = await fetch(`${API_URL}/api/orders/new/count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      // If API endpoint doesn't exist yet, use a fallback mechanism
      console.warn('New orders count API not available, using fallback');
      return getFallbackOrdersCount();
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting new orders count:', error);
    // Use fallback on any error
    return getFallbackOrdersCount();
  }
};

// Fallback to get new orders count if API endpoint isn't ready
const getFallbackOrdersCount = async () => {
  try {
    // Fetch all orders and filter for pending ones
    const response = await getAllOrders({ status: 'Pending', limit: 100 });
    
    // If we have orders data with pagination
    if (response && response.orders) {
      const pendingOrders = response.orders.filter(
        order => order.order_status === 'Pending'
      );
      
      // Get the timestamp of the most recent order
      let lastOrderTime = new Date().toISOString();
      if (pendingOrders.length > 0) {
        // Sort orders by creation date (newest first)
        pendingOrders.sort((a, b) => 
          new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
        lastOrderTime = pendingOrders[0].created_at || lastOrderTime;
      }
      
      return { 
        count: pendingOrders.length,
        lastOrderTime
      };
    }
    
    // If we have just an array of orders
    if (Array.isArray(response)) {
      const pendingOrders = response.filter(
        order => order.order_status === 'Pending'
      );
      
      // Get the timestamp of the most recent order
      let lastOrderTime = new Date().toISOString();
      if (pendingOrders.length > 0) {
        // Sort orders by creation date (newest first)
        pendingOrders.sort((a, b) => 
          new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
        lastOrderTime = pendingOrders[0].created_at || lastOrderTime;
      }
      
      return { 
        count: pendingOrders.length,
        lastOrderTime
      };
    }
    
    return { 
      count: 0,
      lastOrderTime: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in fallback orders count:', error);
    return { 
      count: 0,
      lastOrderTime: new Date().toISOString()
    };
  }
};

// Mark orders as read
export const markOrdersAsRead = async () => {
  try {
    const token = localStorage.getItem('adminToken');
    
    const response = await fetch(`${API_URL}/api/orders/mark-read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn('Mark orders as read API not available');
      return { success: false };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error marking orders as read:', error);
    return { success: false };
  }
};
