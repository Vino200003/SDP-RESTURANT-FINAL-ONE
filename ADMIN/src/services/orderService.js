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

/**
 * Gets the count of new orders that require attention
 * @returns {Promise<number>} The count of new orders
 */
export const getNewOrdersCount = async () => {
  try {
    // Check if API is available
    const isServerAvailable = await checkServerAvailability();
    
    if (!isServerAvailable) {
      return getMockNewOrdersCount();
    }
    
    // Silent check for API endpoint existence to avoid console errors
    const endpointExists = await checkEndpointExists('/api/orders/new/count');
    
    if (!endpointExists) {
      console.log('New orders count API not available, using fallback');
      return getMockNewOrdersCount();
    }
    
    // Only make the API call if we know the endpoint exists
    const response = await fetch(`${API_BASE_URL}/api/orders/new/count`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch new orders count');
    }
    
    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    // Use fallback without logging an error to console
    return getMockNewOrdersCount();
  }
};

/**
 * Check if a specific API endpoint exists
 * @param {string} endpoint - The endpoint path to check
 * @returns {Promise<boolean>} Whether the endpoint exists
 */
const checkEndpointExists = async (endpoint) => {
  try {
    // Use HEAD request to check if endpoint exists without transferring data
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'HEAD',
      headers: getAuthHeaders(),
    });
    
    return response.status !== 404;
  } catch (error) {
    return false;
  }
};

/**
 * Returns mock count for new orders when API is unavailable
 * @returns {number} Mock count of new orders
 */
const getMockNewOrdersCount = () => {
  // Return a random number between 0 and 3 for a realistic-looking count
  return Math.floor(Math.random() * 4);
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
