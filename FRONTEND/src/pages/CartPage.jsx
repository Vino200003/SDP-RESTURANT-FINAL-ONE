import { useState, useEffect, useContext } from 'react';
import '../styles/CartPage.css';
import Footer from '../components/Footer';
import { getCartItems, updateCartItem, removeFromCart, clearCart } from '../utils/cartApi';
import { useNavigate } from 'react-router-dom'; // Import for navigation

// If you have an AuthContext, import it
// import { AuthContext } from '../context/AuthContext';

const CartPage = () => {
  const [cart, setCart] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  
  // If you have AuthContext, you can use it to check login status
  // const { isAuthenticated, user } = useContext(AuthContext);

  // Load cart from database on component mount
  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if user is authenticated (example - modify as needed)
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('User not authenticated, using localStorage cart');
          // Fallback to localStorage if user is not authenticated
          const localCartItems = JSON.parse(localStorage.getItem('cart')) || [];
          setCart(localCartItems);
          setIsLoading(false);
          return;
        }
        
        // Fetch cart from database if authenticated
        const cartItems = await getCartItems();
        setCart(cartItems);
      } catch (error) {
        console.error('Error loading cart:', error);
        setError('Failed to load your cart. Please try again.');
        
        // Fallback to localStorage on error
        try {
          const localCartItems = JSON.parse(localStorage.getItem('cart')) || [];
          setCart(localCartItems);
        } catch (localStorageError) {
          console.error('Error loading cart from localStorage:', localStorageError);
          setCart([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, []);

  // Calculate subtotal whenever cart items change
  useEffect(() => {
    // Calculate subtotal
    const newSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setSubtotal(newSubtotal);
  }, [cart]);

  // Format price to always show 2 decimal places
  const formatPrice = (price) => {
    return parseFloat(price).toFixed(2);
  };
  // Proceed to checkout
  const proceedToCheckout = () => {
    if (cart.length === 0) {
      alert('Your cart is empty. Please add items before checkout.');
      return;
    }
    
    // Navigate to checkout page
    navigate('/checkout');
  };
    // Handle quantity change
  const handleQuantityChange = async (index, change) => {
    const item = cart[index];
    const newQuantity = item.quantity + change;
    
    // Check if authenticated
    const token = localStorage.getItem('token');
    const isAuthenticated = !!token;
    
    if (isAuthenticated && item.cart_item_id) {
      try {
        // If quantity is 0 or less, remove item
        if (newQuantity <= 0) {
          await removeFromCart(item.cart_item_id);
          const updatedCart = cart.filter((_, i) => i !== index);
          setCart(updatedCart);
        } else {
          // Update quantity in database
          await updateCartItem(item.cart_item_id, newQuantity);
          const updatedCart = [...cart];
          updatedCart[index] = { ...updatedCart[index], quantity: newQuantity };
          setCart(updatedCart);
        }
      } catch (error) {
        console.error('Error updating cart item:', error);
        alert('Failed to update cart item. Please try again.');
      }
    } else {
      // Fallback to localStorage for unauthenticated users
      const updatedCart = [...cart];
      
      if (newQuantity <= 0) {
        // Remove item if quantity becomes zero or negative
        updatedCart.splice(index, 1);
      } else {
        updatedCart[index].quantity = newQuantity;
      }
      
      setCart(updatedCart);
      localStorage.setItem('cart', JSON.stringify(updatedCart));
    }
    
    // Dispatch cart updated event for navbar counter
    window.dispatchEvent(new Event('cartUpdated'));
  };

  // Handle removal of item
  const handleRemoveItem = async (index) => {
    const item = cart[index];
    
    // Check if authenticated
    const token = localStorage.getItem('token');
    const isAuthenticated = !!token;
    
    if (isAuthenticated && item.cart_item_id) {
      try {
        // Remove item from database
        await removeFromCart(item.cart_item_id);
        const updatedCart = cart.filter((_, i) => i !== index);
        setCart(updatedCart);
      } catch (error) {
        console.error('Error removing cart item:', error);
        alert('Failed to remove cart item. Please try again.');
      }
    } else {
      // Fallback to localStorage for unauthenticated users
      const updatedCart = [...cart];
      updatedCart.splice(index, 1);
      setCart(updatedCart);
      localStorage.setItem('cart', JSON.stringify(updatedCart));
    }
    
    // Dispatch cart updated event for navbar counter
    window.dispatchEvent(new Event('cartUpdated'));
  };

  // Clear entire cart
  const handleClearCart = async () => {
    // Check if authenticated
    const token = localStorage.getItem('token');
    const isAuthenticated = !!token;
    
    if (isAuthenticated) {
      try {
        // Clear cart in database
        await clearCart();
        setCart([]);
      } catch (error) {
        console.error('Error clearing cart:', error);
        alert('Failed to clear cart. Please try again.');
      }
    } else {
      // Fallback to localStorage for unauthenticated users
      setCart([]);
      localStorage.setItem('cart', JSON.stringify([]));
    }
    
    // Dispatch cart updated event for navbar counter
    window.dispatchEvent(new Event('cartUpdated'));
  };

  // Continue shopping
  const handleContinueShopping = () => {
    navigate('/menu');
  };
  if (isLoading) {
    return (
      <div className="cart-page">
        <div className="cart-header">
          <div className="cart-overlay"></div>
          <div className="cart-content">
            <h2>Your Cart</h2>
            <p>Review your items before checkout</p>
          </div>
        </div>
        <div className="cart-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your cart...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="cart-page">
        <div className="cart-header">
          <div className="cart-overlay"></div>
          <div className="cart-content">
            <h2>Your Cart</h2>
            <p>Review your items before checkout</p>
          </div>
        </div>
        <div className="cart-container">
          <div className="error-container">
            <i className="fas fa-exclamation-circle"></i>
            <h3>Error Loading Cart</h3>
            <p>{error}</p>
            <button 
              className="continue-shopping-btn"
              onClick={handleContinueShopping}
            >
              <i className="fas fa-utensils"></i> Browse Menu
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-header">
          <div className="cart-overlay"></div>
          <div className="cart-content">
            <h2>Your Cart</h2>
            <p>Review your items before checkout</p>
          </div>
        </div>
        <div className="cart-container">
          <div className="empty-cart">
            <i className="fas fa-shopping-cart"></i>
            <h3>Your cart is empty</h3>
            <p>Looks like you haven't added any items to your cart yet.</p>
            <button 
              className="continue-shopping-btn"
              onClick={handleContinueShopping}
            >
              <i className="fas fa-utensils"></i> Browse Menu
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <div className="cart-overlay"></div>
        <div className="cart-content">
          <h2>Your Cart</h2>
          <p>Review your items before checkout</p>
        </div>
      </div>
      
      <div className="cart-container">
        <div className="cart-content-wrapper">
          <div className="cart-items-container">
            <h3>Cart Items ({cart.length})</h3>
              {cart.map((item, index) => (
              <div key={item.cart_item_id || index} className="cart-item">
                <div className="cart-item-image">
                  <img src={item.image_url || 'https://via.placeholder.com/100x100'} alt={item.name} />
                </div>
                <div className="cart-item-details">
                  <h4>{item.name}</h4>
                  <div className="item-price">LKR {formatPrice(item.price)} each</div>
                  {item.special_instructions && (
                    <div className="special-instructions">
                      <span>Special Instructions:</span> {item.special_instructions}
                    </div>
                  )}
                </div>
                <div className="cart-item-actions">
                  <div className="item-total">LKR {formatPrice(item.price * item.quantity)}</div>
                  <div className="quantity-controls">
                    <button 
                      className="qty-btn" 
                      onClick={() => handleQuantityChange(index, -1)}
                    >-</button>
                    <span className="quantity">{item.quantity}</span>
                    <button 
                      className="qty-btn" 
                      onClick={() => handleQuantityChange(index, 1)}
                    >+</button>
                  </div>
                  <button 
                    className="remove-btn"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <i className="fas fa-trash-alt"></i> Remove
                  </button>
                </div>
              </div>
            ))}
            
            <div className="cart-actions">
              <button 
                className="continue-shopping-btn"
                onClick={handleContinueShopping}
              >
                <i className="fas fa-arrow-left"></i> Continue Shopping
              </button>
              <button 
                className="clear-cart-btn"
                onClick={handleClearCart}
              >
                <i className="fas fa-trash"></i> Clear Cart
              </button>
            </div>
          </div>
          
          <div className="cart-summary">
            <h3>Order Summary</h3>
            
            <div className="summary-details">
              <div className="summary-row total">
                <span className="summary-label">Subtotal:</span>
                <span className="summary-value">LKR {formatPrice(subtotal)}</span>
              </div>
            </div>
            
            <button className="checkout-btn" onClick={proceedToCheckout}>
              Proceed to Checkout
            </button>
            
            <button 
              className="continue-shopping"
              onClick={handleContinueShopping}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CartPage;
