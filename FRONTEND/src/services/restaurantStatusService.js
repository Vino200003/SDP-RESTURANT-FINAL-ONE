import { API_URL } from '../config';

/**
 * Check if the restaurant is currently open
 * @returns {Promise<Object>} Status object with isOpen flag and other info
 */
export const checkRestaurantOpen = async () => {
  try {
    const response = await fetch(`${API_URL}/operating-hours/status/open`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to check restaurant status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking if restaurant is open:', error);
    // Default to closed on error to prevent invalid orders
    return { 
      isOpen: false, 
      reason: 'Unable to check restaurant hours', 
      error: error.message 
    };
  }
};
