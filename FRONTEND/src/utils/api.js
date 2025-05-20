/**
 * API utility functions for making requests to the backend
 */

// Base URL for API requests - using relative path with proxy
const API_URL = '/api';

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise} - Response from the API
 */
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    
    return data;
  } catch (error) {
    console.error('API error during registration:', error);
    throw error;
  }
};

/**
 * Login user
 * @param {Object} credentials - User login credentials
 * @returns {Promise} - Response from the API
 */
export const loginUser = async (credentials) => {
  try {
    const response = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    // Store the token automatically if it's present
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    
    return data;
  } catch (error) {
    console.error('API error during login:', error);
    throw error;
  }
};

/**
 * Check if a token is valid (not expired)
 * @param {string} token - JWT token to check
 * @returns {boolean} - True if token appears valid
 */
const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    // Basic check for JWT format
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Check expiration
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    const now = Math.floor(Date.now() / 1000);
    
    return exp > now;
  } catch (error) {
    console.error('Error checking token validity:', error);
    return false;
  }
};

/**
 * Get valid authentication token or clear invalid ones
 * @returns {string|null} - Valid token or null
 */
const getAuthToken = () => {
  const token = localStorage.getItem('token');
  
  if (!token || !isTokenValid(token)) {
    // Clear invalid token
    localStorage.removeItem('token');
    return null;
  }
  
  return token;
};

/**
 * Check authentication status
 * @returns {Promise} - Response with user data if authenticated
 */
export const checkAuth = async () => {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No valid authentication token found');
    }
    
    const response = await fetch(`${API_URL}/users/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-auth-token': token  // Keep for backward compatibility
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Authentication failed');
    }
    
    return data;
  } catch (error) {
    console.error('API error during authentication check:', error);
    throw error;
  }
};

/**
 * Logout user
 * @returns {Promise} - Response from the API
 */
export const logoutUser = async () => {
  try {
    localStorage.removeItem('token');
    return { success: true };
  } catch (error) {
    console.error('Error during logout:', error);
    throw error;
  }
};

/**
 * Get all menu items
 * @returns {Promise} - Response with menu data
 */
export const getAllMenuItems = async () => {
  try {
    const response = await fetch(`${API_URL}/menu`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch menu items');
    }
    
    return data;
  } catch (error) {
    console.error('API error fetching menu items:', error);
    throw error;
  }
};

/**
 * Get menu categories
 * @returns {Promise} - Response with menu categories
 */
export const getMenuCategories = async () => {
  try {
    const response = await fetch(`${API_URL}/menu/categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch menu categories');
    }
    
    return data;
  } catch (error) {
    console.error('API error fetching menu categories:', error);
    throw error;
  }
};

/**
 * Get menu items by category
 * @param {string} categoryCode - Category code to filter by
 * @returns {Promise} - Response with filtered menu items
 */
export const getMenuItemsByCategory = async (categoryCode) => {
  try {
    const response = await fetch(`${API_URL}/menu/category/${categoryCode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch category items');
    }
    
    return data;
  } catch (error) {
    console.error('API error fetching category items:', error);
    throw error;
  }
};

/**
 * Get all available tables
 * @returns {Promise} - Response with table data
 */
export const getAllTables = async () => {
  try {
    console.log('Fetching tables from API...');
    const apiUrl = `${API_URL}/reservations/tables`;
    console.log('API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
      // Removed credentials: 'include' as it might cause issues with CORS
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = `Failed to fetch tables: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (jsonError) {
        console.error('Error parsing error response:', jsonError);
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('Fetched tables data:', data);
    return data;
  } catch (error) {
    console.error('API error fetching tables:', error);
    throw error;
  }
};

/**
 * Get available tables for a specific date/time
 * @param {string} dateTime - ISO datetime string
 * @returns {Promise} - Response with available tables
 */
export const getAvailableTables = async (dateTime) => {
  try {
    console.log(`Fetching available tables for ${dateTime}`);
    
    const response = await fetch(`${API_URL}/reservations/available-tables?dateTime=${encodeURIComponent(dateTime)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch available tables');
    }
    
    console.log(`Retrieved ${data.length} tables with availability information`);
    return data;
  } catch (error) {
    console.error('API error fetching available tables:', error);
    throw error;
  }
};

/**
 * Get tables available at the current time
 * @returns {Promise<Array>} Array of available tables
 */
export const getAvailableTablesForNow = async () => {
  try {
    const currentDateTime = new Date().toISOString();
    console.log('Fetching available tables for current time:', currentDateTime);
    
    const response = await fetch(`${API_URL}/reservations/available-tables?dateTime=${encodeURIComponent(currentDateTime)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Available tables response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = `Failed to fetch available tables: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (jsonError) {
        console.error('Error parsing error response:', jsonError);
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('Available tables data:', data);
    return data;
  } catch (error) {
    console.error('API error fetching available tables:', error);
    throw error;
  }
};

/**
 * Create a new reservation
 * @param {Object} reservationData - Reservation details
 * @returns {Promise} - Response from the API
 */
export const createReservation = async (reservationData) => {
  try {
    console.log('Creating reservation with data:', reservationData);
    
    // Get authentication token from localStorage
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(reservationData)
    });
    
    const data = await response.json();
      if (!response.ok) {
      // Enhanced error handling for conflicts and other errors
      if (response.status === 409) {
        const conflictMsg = data.message || 'Sorry, this table is already reserved at the selected time. Please choose a different table or time.';
        console.error('Table reservation conflict:', conflictMsg);
        
        // Make sure any table conflict errors are consistently formatted
        if (conflictMsg.includes('Table') && !conflictMsg.includes('already reserved')) {
          throw new Error(`Table ${data.tableNo || ''} is already reserved. ${conflictMsg}`);
        } else {
          throw new Error(conflictMsg);
        }
      }
      throw new Error(data.message || 'Failed to create reservation');
    }
    
    return data;
  } catch (error) {
    console.error('API error creating reservation:', error);
    throw error;
  }
};

/**
 * Get user's profile
 * @returns {Promise} - Response with user profile data
 */
export const getUserProfile = async () => {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No valid authentication token found');
    }
    
    console.log('Fetching profile with token:', token.substring(0, 15) + '...');
    
    const response = await fetch(`${API_URL}/users/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-auth-token': token  // Keep for backward compatibility
      },
      credentials: 'include'
    });
    
    if (response.status === 401) {
      // Clear invalid token
      localStorage.removeItem('token');
      throw new Error('Your session has expired. Please login again.');
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch user profile');
    }
    
    return data;
  } catch (error) {
    console.error('API error fetching user profile:', error);
    throw error;
  }
};

/**
 * Update user's profile
 * @param {Object} profileData - Updated profile data
 * @returns {Promise} - Response with updated profile data
 */
export const updateUserProfile = async (profileData) => {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No valid authentication token found');
    }
    
    const response = await fetch(`${API_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-auth-token': token  // Keep for backward compatibility
      },
      body: JSON.stringify(profileData),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update user profile');
    }
    
    return data;
  } catch (error) {
    console.error('API error updating user profile:', error);
    throw error;
  }
};

/**
 * Get user's reservations
 * @returns {Promise} - Response from the API with user's reservations
 */
export const getUserReservations = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Get user data from local storage as fallback
    const userData = JSON.parse(localStorage.getItem('user')) || {};
    const userId = userData.id || userData.user_id;
    
    // Include userId as query param as fallback
    const url = `${API_URL}/reservations/user${userId ? `?userId=${userId}` : ''}`;
    
    console.log('Requesting reservations from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      }
    });
    
    // Try to parse the response
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      return []; // Return empty array on parse error
    }
    
    if (!response.ok) {
      console.error('API error response:', data);
      // Just return empty array instead of throwing
      return [];
    }
    
    console.log('Successfully fetched reservations:', data);
    
    // Ensure we always return an array
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('API error fetching user reservations:', error);
    // Return empty array instead of throwing to avoid breaking the UI
    return [];
  }
};

/**
 * Update a user reservation
 * @param {number} reservationId - The ID of the reservation to update
 * @param {Object} reservationData - Updated reservation data
 * @returns {Promise} - Response from the API
 */
export const updateReservation = async (reservationId, reservationData) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    console.log('Using token for reservation update:', token);
    
    // Use both authorization headers to ensure compatibility
    const response = await fetch(`${API_URL}/reservations/${reservationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(reservationData),
      credentials: 'include'
    });
    
    // Log response status for debugging
    console.log('Reservation update response status:', response.status);
    
    const data = await response.json();
    console.log('Reservation update response data:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update reservation');
    }
    
    return data;
  } catch (error) {
    console.error('API error updating reservation:', error);
    throw error;
  }
};

/**
 * Cancel a reservation
 * @param {number} reservationId - The ID of the reservation to cancel
 * @returns {Promise} - Response from the API
 */
export const cancelReservation = async (reservationId) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Use both authorization headers for better compatibility
    const response = await fetch(`${API_URL}/reservations/${reservationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token,
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to cancel reservation');
    }
    
    return data;
  } catch (error) {
    console.error('API error canceling reservation:', error);
    throw error;
  }
};

/**
 * Check if a user is currently authenticated
 * @returns {boolean} - True if user is authenticated, false otherwise
 */
export const isUserAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token; // Convert to boolean
};

/**
 * Get user's order history
 * @returns {Promise} - Response with user's order history
 */
export const getUserOrders = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Get user data from local storage
    const userData = JSON.parse(localStorage.getItem('user')) || {};
    const userId = userData.id || userData.user_id;
    
    if (!userId) {
      console.error('User ID not found in local storage');
      return [];
    }
    
    // Use the main orders endpoint that worked
    const response = await fetch('http://localhost:5000/api/orders', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    
    if (!response.ok) {
      // Check if it's a 404, which might mean the user has no orders yet
      if (response.status === 404) {
        // Return empty array instead of throwing error for no orders
        return [];
      }
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch order history');
    }
    
    const data = await response.json();
    console.log('Orders successfully retrieved from: http://localhost:5000/api/orders');
    
    // Filter orders to only include those belonging to the current user
    const allOrders = Array.isArray(data) ? data : (data.orders || []);
    const userOrders = allOrders.filter(order => order.user_id === userId);
    
    console.log(`Filtered ${allOrders.length} orders to ${userOrders.length} for user ID ${userId}`);
    return userOrders;
  } catch (error) {
    console.error('API error fetching orders:', error);
    // If there's an error, return an empty array instead of throwing
    return [];
  }
};

/**
 * Get specific order details
 * @param {number} orderId - The ID of the order to fetch details for
 * @returns {Promise} - Response with order details
 */
export const getOrderDetails = async (orderId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch order details');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API error fetching order details:', error);
    throw error;
  }
};

/**
 * Create a new order
 * @param {Object} orderData - Order details
 * @returns {Promise} - Response from the API
 */
export const createOrder = async (orderData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create order');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API error creating order:', error);
    throw error;
  }
};

/**
 * Update an existing order
 * @param {number} orderId - The ID of the order to update
 * @param {Object} orderData - Updated order data including items
 * @returns {Promise} - Response with updated order
 */
export const updateOrder = async (orderId, orderData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Ensure we're sending all required fields for the update
    const dataToSend = {
      items: orderData.items,
      total_amount: orderData.total_amount,
      order_type: orderData.order_type,
      // Make sure delivery address is included for delivery orders
      ...(orderData.order_type === 'Delivery' && { delivery_address: orderData.delivery_address }),
      // Include special instructions if provided
      ...(orderData.special_instructions && { special_instructions: orderData.special_instructions })
    };
    
    // Use the standardized API_URL pattern
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dataToSend),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update order');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API error updating order:', error);
    throw error;
  }
};

/**
 * Cancel an order (if it's still pending)
 * @param {number} orderId - The ID of the order to cancel
 * @returns {Promise} - Response from the API
 */
export const cancelOrder = async (orderId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to cancel order');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API error canceling order:', error);
    throw error;
  }
};

/**
 * Fetch all active delivery zones
 * @returns {Promise} Promise object that resolves to an array of delivery zones
 */
export const getDeliveryZones = async () => {
  try {
    console.log('Fetching delivery zones from API...');
    // First try to fetch from API
    const response = await fetch('http://localhost:5000/api/delivery-zones/public', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch delivery zones');
    }
    
    const data = await response.json();
    console.log('Successfully fetched delivery zones:', data);
    
    // Normalize the data to ensure it has the properties we expect
    return data.map(zone => ({
      ...zone,
      zone_id: zone.id || zone.zone_id,
      gs_division: zone.name || zone.gs_division,
      estimated_delivery_time_min: zone.estimated_time || zone.estimated_delivery_time_min
    }));
  } catch (error) {
    console.error('Error fetching delivery zones:', error);
    
    // Return hardcoded fallback values if API call fails
    console.log('Using fallback delivery zones data');
    return [
      { zone_id: 1, gs_division: 'Vavuniya South', delivery_fee: 5.00, estimated_delivery_time_min: 30 },
      { zone_id: 2, gs_division: 'Vavuniya North', delivery_fee: 6.50, estimated_delivery_time_min: 40 },
      { zone_id: 3, gs_division: 'Vavuniya', delivery_fee: 4.50, estimated_delivery_time_min: 25 },
      { zone_id: 4, gs_division: 'Vengalacheddikulam', delivery_fee: 8.00, estimated_delivery_time_min: 50 },
      { zone_id: 5, gs_division: 'Nedunkeni', delivery_fee: 7.50, estimated_delivery_time_min: 45 },
      { zone_id: 6, gs_division: 'Cheddikulam', delivery_fee: 7.00, estimated_delivery_time_min: 45 }
    ];
  }
};

/**
 * Get delivery fee by zone ID
 * @param {number} zoneId - Zone ID
 * @returns {Promise} Promise object that resolves to the delivery fee
 */
export const getDeliveryFeeByZoneId = async (zoneId) => {
  try {
    const response = await fetch(`http://localhost:5000/api/delivery-zones/fee/${zoneId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch delivery fee');
    }
    
    const data = await response.json();
    return parseFloat(data.delivery_fee);
  } catch (error) {
    console.error('Error fetching delivery fee:', error);
    // Return default delivery fee of 5.00 as fallback
    return 5.00;
  }
};
