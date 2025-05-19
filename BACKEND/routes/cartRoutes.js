const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

// All cart routes require authentication
router.use(protect);

// Get cart items for the logged-in user
router.get('/', cartController.getCartItems);

// Add item to cart
router.post('/items', cartController.addToCart);

// Update cart item quantity
router.put('/items/:cart_item_id', cartController.updateCartItem);

// Remove item from cart
router.delete('/items/:cart_item_id', cartController.removeFromCart);

// Clear entire cart
router.delete('/', cartController.clearCart);

module.exports = router;
