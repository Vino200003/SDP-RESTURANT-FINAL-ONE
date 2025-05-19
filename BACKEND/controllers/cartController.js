const db = require('../config/db');

/**
 * Get user's cart items
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getCartItems = async (req, res) => {
  console.log('User object from request:', req.user);
  const userId = req.user.id;
  console.log('Extracted user ID:', userId);
  try {
    // Get or create cart for the user
    const cart = await getOrCreateCart(userId);

    const query = `
      SELECT ci.*, m.menu_name as name, m.description, m.image_url 
      FROM cart_items ci
      INNER JOIN menu m ON ci.menu_id = m.menu_id
      WHERE ci.user_id = ?
      ORDER BY ci.added_at DESC
    `;    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error('Error retrieving cart items:', err);
        return res.status(500).json({ message: 'Failed to retrieve cart items', error: err.message });
      }

      console.log('Cart items retrieved successfully:', results);
      return res.status(200).json(results);
    });
  } catch (error) {
    console.error('Error in getCartItems:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Add item to cart
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.addToCart = async (req, res) => {
  const userId = req.user.id;
  const { menu_id, quantity, special_instructions, price } = req.body;

  if (!menu_id || !price) {
    return res.status(400).json({ message: 'Menu item ID and price are required' });
  }

  try {
    // Get or create cart for the user
    const cart = await getOrCreateCart(userId);

    // Check if the item already exists in the cart
    const checkQuery = 'SELECT * FROM cart_items WHERE user_id = ? AND menu_id = ?';
    
    db.query(checkQuery, [userId, menu_id], (checkErr, checkResults) => {
      if (checkErr) {
        console.error('Error checking cart item:', checkErr);
        return res.status(500).json({ message: 'Error checking cart item', error: checkErr.message });
      }

      if (checkResults.length > 0) {
        // Item exists, update quantity
        const newQuantity = checkResults[0].quantity + (quantity || 1);
        
        const updateQuery = `
          UPDATE cart_items 
          SET quantity = ?, 
              special_instructions = ?
          WHERE cart_item_id = ?
        `;
        
        db.query(updateQuery, [
          newQuantity, 
          special_instructions || checkResults[0].special_instructions, 
          checkResults[0].cart_item_id
        ], (updateErr) => {
          if (updateErr) {
            console.error('Error updating cart item:', updateErr);
            return res.status(500).json({ message: 'Failed to update cart item', error: updateErr.message });
          }
          
          return res.status(200).json({ 
            message: 'Cart item updated successfully',
            cart_item_id: checkResults[0].cart_item_id,
            quantity: newQuantity
          });
        });
      } else {
        // Item doesn't exist, add new item
        const insertQuery = `
          INSERT INTO cart_items (cart_id, user_id, menu_id, quantity, special_instructions, price)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        db.query(insertQuery, [
          cart.cart_id, 
          userId, 
          menu_id, 
          quantity || 1, 
          special_instructions || '', 
          price
        ], (insertErr, result) => {
          if (insertErr) {
            console.error('Error adding item to cart:', insertErr);
            return res.status(500).json({ message: 'Failed to add item to cart', error: insertErr.message });
          }
          
          return res.status(201).json({
            message: 'Item added to cart successfully',
            cart_item_id: result.insertId,
            quantity: quantity || 1
          });
        });
      }
    });
  } catch (error) {
    console.error('Error in addToCart:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Update cart item quantity
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.updateCartItem = async (req, res) => {
  const userId = req.user.id;
  const { cart_item_id } = req.params;
  const { quantity, special_instructions } = req.body;

  if (!cart_item_id) {
    return res.status(400).json({ message: 'Cart item ID is required' });
  }

  try {
    // Check if item exists and belongs to the user
    const checkQuery = 'SELECT * FROM cart_items WHERE cart_item_id = ? AND user_id = ?';
    
    db.query(checkQuery, [cart_item_id, userId], (checkErr, checkResults) => {
      if (checkErr) {
        console.error('Error checking cart item:', checkErr);
        return res.status(500).json({ message: 'Error checking cart item', error: checkErr.message });
      }

      if (checkResults.length === 0) {
        return res.status(404).json({ message: 'Cart item not found or not owned by user' });
      }

      // Prepare update fields
      const updateFields = [];
      const updateValues = [];

      if (quantity !== undefined) {
        updateFields.push('quantity = ?');
        updateValues.push(quantity);
      }

      if (special_instructions !== undefined) {
        updateFields.push('special_instructions = ?');
        updateValues.push(special_instructions);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      // Add cart_item_id to values array
      updateValues.push(cart_item_id);
      updateValues.push(userId);

      // Update cart item
      const updateQuery = `
        UPDATE cart_items 
        SET ${updateFields.join(', ')} 
        WHERE cart_item_id = ? AND user_id = ?
      `;

      db.query(updateQuery, updateValues, (updateErr, updateResult) => {
        if (updateErr) {
          console.error('Error updating cart item:', updateErr);
          return res.status(500).json({ message: 'Failed to update cart item', error: updateErr.message });
        }

        // If quantity is 0, remove the item
        if (quantity !== undefined && quantity <= 0) {
          return removeCartItem(cart_item_id, userId, res);
        }

        return res.status(200).json({ 
          message: 'Cart item updated successfully',
          cart_item_id: cart_item_id
        });
      });
    });
  } catch (error) {
    console.error('Error in updateCartItem:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Remove item from cart
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.removeFromCart = async (req, res) => {
  const userId = req.user.id;
  const { cart_item_id } = req.params;

  if (!cart_item_id) {
    return res.status(400).json({ message: 'Cart item ID is required' });
  }

  try {
    return removeCartItem(cart_item_id, userId, res);
  } catch (error) {
    console.error('Error in removeFromCart:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Clear user's cart
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.clearCart = async (req, res) => {
  const userId = req.user.id;

  try {
    const query = 'DELETE FROM cart_items WHERE user_id = ?';
    
    db.query(query, [userId], (err, result) => {
      if (err) {
        console.error('Error clearing cart:', err);
        return res.status(500).json({ message: 'Failed to clear cart', error: err.message });
      }

      return res.status(200).json({ message: 'Cart cleared successfully' });
    });
  } catch (error) {
    console.error('Error in clearCart:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Helper function to get or create cart for a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - Cart object
 */
const getOrCreateCart = (userId) => {
  return new Promise((resolve, reject) => {
    console.log('Getting or creating cart for user:', userId);
    // Check if user already has a cart
    const checkQuery = 'SELECT * FROM cart WHERE user_id = ?';
    
    db.query(checkQuery, [userId], (checkErr, checkResults) => {
      if (checkErr) {
        console.error('Error checking for existing cart:', checkErr);
        return reject(checkErr);
      }
      
      console.log('Cart check results:', checkResults);

      if (checkResults.length > 0) {
        // User has a cart, return it
        return resolve(checkResults[0]);
      } else {
        // User doesn't have a cart, create a new one
        const createQuery = 'INSERT INTO cart (user_id) VALUES (?)';
        
        db.query(createQuery, [userId], (createErr, createResult) => {
          if (createErr) {
            return reject(createErr);
          }

          // Return the newly created cart
          return resolve({
            cart_id: createResult.insertId,
            user_id: userId,
            created_at: new Date()
          });
        });
      }
    });
  });
};

/**
 * Helper function to remove cart item
 * @param {number} cartItemId - Cart item ID
 * @param {number} userId - User ID
 * @param {Object} res - Response object
 * @returns {Object} - Response
 */
const removeCartItem = (cartItemId, userId, res) => {
  const deleteQuery = 'DELETE FROM cart_items WHERE cart_item_id = ? AND user_id = ?';
  
  db.query(deleteQuery, [cartItemId, userId], (deleteErr, deleteResult) => {
    if (deleteErr) {
      console.error('Error removing cart item:', deleteErr);
      return res.status(500).json({ message: 'Failed to remove cart item', error: deleteErr.message });
    }

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ message: 'Cart item not found or not owned by user' });
    }

    return res.status(200).json({ 
      message: 'Cart item removed successfully',
      cart_item_id: cartItemId
    });
  });
};
