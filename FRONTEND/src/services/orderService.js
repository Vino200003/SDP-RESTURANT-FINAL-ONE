import { API_URL } from '../config';
import { checkRestaurantOpen } from './restaurantStatusService';

/**
 * Create a new order with operating hours validation
 * @param {Object} orderData Order data including items, user_id, delivery details, etc.
 * @returns {Promise<Object>} Created order details or error
 */
export const createOrder = async (orderData) => {
  try {
    // First check if restaurant is open
    const { isOpen, reason, openTime, closeTime, currentDay } = await checkRestaurantOpen();
    
    if (!isOpen) {
      // Format the time for display (convert from 24h to 12h format)
      const formatTimeDisplay = (timeStr) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${minutes} ${ampm}`;
      };
      
      const formattedOpenTime = formatTimeDisplay(openTime);
      const formattedCloseTime = formatTimeDisplay(closeTime);
      
      throw new Error(
        `Restaurant is currently closed. ${reason}. ` + 
        `Our hours for ${currentDay} are ${formattedOpenTime} - ${formattedCloseTime}. ` +
        `Please visit our Contact page to see our full schedule.`
      );
    }
    
    // Restaurant is open, proceed with order
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create order');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

/**
 * Get order by ID
 * @param {number|string} orderId Order ID
 * @returns {Promise<Object>} Order details
 */
export const getOrderById = async (orderId) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required to view order');
    }
    
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch order details');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
};

/**
 * Get all orders for the current user
 * @param {Object} params Optional params like page, limit
 * @returns {Promise<Object>} List of orders and pagination info
 */
export const getUserOrders = async (params = {}) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required to view orders');
    }
    
    // Build query string from params
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined) {
        queryParams.append(key, params[key]);
      }
    });
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    const response = await fetch(`${API_URL}/orders/user${query}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch orders');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user orders:', error);
    throw error;
  }
};
