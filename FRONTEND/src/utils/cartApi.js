/**
 * Cart API functions to interact with backend cart routes
 */

import { API_URL } from './config';

/**
 * Get the user's auth token from local storage
 * @returns {string|null} - The auth token or null if not found
 */
const getAuthToken = () => localStorage.getItem('token');

/**
 * Get all items in the user's cart
 * @returns {Promise<Array>} - Array of cart items
 */
export const getCartItems = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required to access cart');
    }

    const response = await fetch(`${API_URL}/cart`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch cart items');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching cart items:', error);
    throw error;
  }
};

/**
 * Add an item to the cart
 * @param {Object} item - The item to add to the cart
 * @returns {Promise<Object>} - The API response
 */
export const addToCart = async (item) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required to add to cart');
    }

    const { menu_id, price, quantity = 1, special_instructions = '' } = item;

    const response = await fetch(`${API_URL}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        menu_id,
        price,
        quantity,
        special_instructions
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to add item to cart');
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding item to cart:', error);
    throw error;
  }
};

/**
 * Update a cart item's quantity
 * @param {number} cartItemId - The ID of the cart item to update
 * @param {number} quantity - The new quantity
 * @param {string} [specialInstructions] - Optional special instructions
 * @returns {Promise<Object>} - The API response
 */
export const updateCartItem = async (cartItemId, quantity, specialInstructions) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required to update cart');
    }

    const body = { quantity };
    if (specialInstructions !== undefined) {
      body.special_instructions = specialInstructions;
    }

    const response = await fetch(`${API_URL}/cart/items/${cartItemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update cart item');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating cart item:', error);
    throw error;
  }
};

/**
 * Remove an item from the cart
 * @param {number} cartItemId - The ID of the cart item to remove
 * @returns {Promise<Object>} - The API response
 */
export const removeFromCart = async (cartItemId) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required to remove from cart');
    }

    const response = await fetch(`${API_URL}/cart/items/${cartItemId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to remove cart item');
    }

    return await response.json();
  } catch (error) {
    console.error('Error removing cart item:', error);
    throw error;
  }
};

/**
 * Clear all items from the cart
 * @returns {Promise<Object>} - The API response
 */
export const clearCart = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required to clear cart');
    }

    const response = await fetch(`${API_URL}/cart`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to clear cart');
    }

    return await response.json();
  } catch (error) {
    console.error('Error clearing cart:', error);
    throw error;
  }
};
