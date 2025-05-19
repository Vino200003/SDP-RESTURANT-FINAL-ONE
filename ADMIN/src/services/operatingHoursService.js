import config from '../config';
const API_URL = config.API_URL;

/**
 * Get all operating hours
 */
export const getAllOperatingHours = async () => {
  try {
    const response = await fetch(`${API_URL}/operating-hours`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch operating hours');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in getAllOperatingHours:', error);
    throw error;
  }
};

/**
 * Get operating hours for a specific day
 * @param {string} day - Day of week (e.g., 'Monday')
 */
export const getOperatingHoursByDay = async (day) => {
  try {
    const response = await fetch(`${API_URL}/operating-hours/${day}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to fetch operating hours for ${day}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error in getOperatingHoursByDay for ${day}:`, error);
    throw error;
  }
};

/**
 * Update operating hours for a specific day
 * @param {string} day - Day of week (e.g., 'Monday')
 * @param {object} data - Operating hours data
 */
export const updateOperatingHours = async (day, data) => {
  try {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Authentication required');
    }
      const response = await fetch(`${API_URL}/operating-hours/${day}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to update operating hours for ${day}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error in updateOperatingHours for ${day}:`, error);
    throw error;
  }
};

/**
 * Batch update multiple days' operating hours
 * @param {Array} operatingHours - Array of operating hours objects
 */
export const batchUpdateOperatingHours = async (operatingHours) => {
  try {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      throw new Error('Authentication required');
    }
      const response = await fetch(`${API_URL}/operating-hours`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(operatingHours)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update operating hours');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in batchUpdateOperatingHours:', error);
    throw error;
  }
};