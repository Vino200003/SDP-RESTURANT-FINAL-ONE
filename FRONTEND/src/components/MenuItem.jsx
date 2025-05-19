import React, { useState, useEffect } from 'react';
import '../styles/MenuItem.css';
import { defaultFoodImage } from '../assets/imageData';
import { addToCart as apiAddToCart, getCartItems } from '../utils/cartApi';

const MenuItem = ({ item }) => {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(0);

  // Function to handle image loading errors
  const handleImageError = (e) => {
    e.target.src = defaultFoodImage;
  };
  // Format price to always show 2 decimal places
  const formattedPrice = parseFloat(item.price).toFixed(2);
  
  // Check if the item is already in the cart
  useEffect(() => {
    const checkCart = async () => {
      try {
        // Check if user is authenticated
        const token = localStorage.getItem('token');
        
        if (token) {
          // For authenticated users, fetch cart from API
          try {
            const cartItems = await getCartItems();
            console.log('Got cart items from API:', cartItems);
            const existingItem = cartItems.find(cartItem => Number(cartItem.menu_id) === Number(item.menu_id));
            
            if (existingItem) {
              setQuantity(existingItem.quantity);
              console.log('Found item in database cart, quantity:', existingItem.quantity);
              return;
            }
          } catch (apiError) {
            console.error('Error checking database cart:', apiError);
            // Fall through to localStorage check if API fails
          }
        }
        
        // For unauthenticated users or as fallback, check localStorage
        const currentCart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingItem = currentCart.find(cartItem => cartItem.id === item.menu_id);
        
        if (existingItem) {
          setQuantity(existingItem.quantity);
          console.log('Found item in localStorage cart, quantity:', existingItem.quantity);
        } else {
          setQuantity(0);
          console.log('Item not found in cart, quantity set to 0');
        }
      } catch (error) {
        console.error('Error checking cart:', error);
        setQuantity(0);
      }
    };

    checkCart();
      // Listen for cart updates
    const handleCartUpdate = () => {
      console.log('Cart update detected, rechecking cart for item:', item.menu_name);
      checkCart();
    };
    console.log('Adding cartUpdated event listener for item:', item.menu_name);
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {    window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [item.menu_id]);
  
  // Add to cart function
  const addToCart = async () => {
    console.log('addToCart clicked for item:', item.menu_name);
    setIsAddingToCart(true);
    
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      const isAuthenticated = !!token;
      
      if (isAuthenticated) {
        // Use API to add to cart for authenticated users
        await apiAddToCart({
          menu_id: item.menu_id,
          price: item.price,
          quantity: 1,
          special_instructions: ''
        });
        // Update quantity immediately to show controls
        setQuantity(1);
      } else {
        // Use localStorage for unauthenticated users
        const currentCart = JSON.parse(localStorage.getItem('cart')) || [];
        
        // Check if item already exists in cart
        const existingItemIndex = currentCart.findIndex(cartItem => cartItem.id === item.menu_id);
        let newQuantity = 1;
        
        if (existingItemIndex >= 0) {
          // Item exists, increase quantity
          currentCart[existingItemIndex].quantity += 1;
          newQuantity = currentCart[existingItemIndex].quantity;
        } else {
          // Item doesn't exist, add new item
          currentCart.push({
            id: item.menu_id,
            name: item.menu_name,
            price: item.price,
            image_url: item.image_url || defaultFoodImage,
            quantity: 1,
            category: item.category_name,
            subcategory: item.subcategory_name
          });
        }
        
        // Save updated cart to localStorage
        localStorage.setItem('cart', JSON.stringify(currentCart));
        
        // Update quantity immediately to show controls
        setQuantity(newQuantity);
      }
      
      // Dispatch custom event to notify other components (like Navbar) that cart has been updated
      const event = new Event('cartUpdated');
      window.dispatchEvent(event);
      console.log('Cart updated event dispatched for item:', item.menu_name, 'Action: added to cart');
      
      // Reset adding state immediately
      setIsAddingToCart(false);
    } catch (error) {
      console.error('Error adding to cart:', error);
      
      // Show error to user
      alert('Failed to add item to cart. Please try again.');
        // Reset button state
      setIsAddingToCart(false);
    }
  };
  
  // Update item quantity
  const updateQuantity = async (newQuantity) => {
    // Prevent negative quantities
    if (newQuantity < 0) return;
    
    console.log('updateQuantity called with new quantity:', newQuantity, 'for item:', item.menu_name);
    
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      const isAuthenticated = !!token;
      
      if (isAuthenticated) {
        // Use API for authenticated users
        try {
          // First get the user's cart to find the cart_item_id
          const { getCartItems, removeFromCart, updateCartItem } = await import('../utils/cartApi');
          const cartData = await getCartItems();
          
          // Debug log to verify what menu_id we're looking for
          console.log('Looking for menu_id:', item.menu_id, 'in cart data:', cartData);
          
          // Find the cart item with matching menu_id
          const cartItem = cartData.find(cartItem => Number(cartItem.menu_id) === Number(item.menu_id));
          
          if (cartItem) {
            console.log('Found matching cart item:', cartItem);
            
            if (newQuantity === 0) {
              // Remove item if quantity is 0
              await removeFromCart(cartItem.cart_item_id);
              console.log('Removed item from cart, cart_item_id:', cartItem.cart_item_id);
            } else {
              // Update quantity
              await updateCartItem(cartItem.cart_item_id, newQuantity);
              console.log('Updated item quantity to', newQuantity, 'cart_item_id:', cartItem.cart_item_id);
            }
            
            // Update local state
            setQuantity(newQuantity);
          } else {
            console.error('Item not found in cart data');
            // If item not found in DB but quantity > 0, try to add it
            if (newQuantity > 0) {
              console.log('Attempting to add item to cart');
              await apiAddToCart({
                menu_id: item.menu_id,
                price: item.price,
                quantity: newQuantity,
                special_instructions: ''
              });
              setQuantity(newQuantity);
            }
          }
        } catch (apiError) {
          console.error('API error updating cart:', apiError);
          throw apiError;
        }
      } else {
        // Use localStorage for unauthenticated users
        const currentCart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingItemIndex = currentCart.findIndex(cartItem => cartItem.id === item.menu_id);
        
        if (existingItemIndex >= 0) {
          if (newQuantity === 0) {
            // Remove item if quantity is 0
            currentCart.splice(existingItemIndex, 1);
            console.log('Removed item from localStorage cart');
          } else {
            // Update quantity
            currentCart[existingItemIndex].quantity = newQuantity;
            console.log('Updated localStorage item quantity to', newQuantity);
          }
          
          // Save updated cart
          localStorage.setItem('cart', JSON.stringify(currentCart));
          
          // Update local state
          setQuantity(newQuantity);
        } else if (newQuantity > 0) {
          // Item not in cart but trying to add it
          currentCart.push({
            id: item.menu_id,
            name: item.menu_name,
            price: item.price,
            image_url: item.image_url || defaultFoodImage,
            quantity: newQuantity,
            category: item.category_name,
            subcategory: item.subcategory_name
          });
          
          localStorage.setItem('cart', JSON.stringify(currentCart));
          setQuantity(newQuantity);
          console.log('Added new item to localStorage cart with quantity', newQuantity);
        }
      }
      
      // Notify other components
      const event = new Event('cartUpdated');
      window.dispatchEvent(event);
      console.log('Cart updated event dispatched for item:', item.menu_name, 'New quantity:', newQuantity);
    } catch (error) {
      console.error('Error updating cart item:', error);
      alert('Failed to update cart item. Please try again.');
    }
  };
  // For debugging
  console.log(`Rendering ${item.menu_name} with quantity: ${quantity}, status: ${item.status}`);
  
  return (
    <div className="menu-item">
      <div className="menu-item-image">
        <img 
          src={item.image_url || defaultFoodImage} 
          alt={item.menu_name} 
          onError={handleImageError}
        />
        {item.status === 'out_of_stock' && (
          <div className="out-of-stock-badge">Out of Stock</div>
        )}
      </div>
      <div className="menu-item-content">
        <h3 className="menu-item-name">{item.menu_name}</h3>
        {item.description && (
          <p className="menu-item-description">{item.description}</p>
        )}
        <div className="menu-item-categories">
          <span className="menu-category">{item.category_name}</span>
          {item.subcategory_name && (
            <span className="menu-subcategory">{item.subcategory_name}</span>
          )}
        </div>        <div className="menu-item-price-row">
          <span className="menu-item-price">LKR {formattedPrice}</span>
          {item.status === 'available' ? (
            <div className="cart-control-container">
              {quantity > 0 ? (
                <div className="menu-quantity-controls">
                  <button 
                    className="menu-quantity-btn"
                    onClick={() => updateQuantity(quantity - 1)}
                    aria-label="Decrease quantity"
                  >                    <span>-</span>
                  </button>
                  <span className="menu-quantity">{quantity}</span>
                  <button 
                    className="menu-quantity-btn"
                    onClick={() => updateQuantity(quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <span>+</span>
                  </button>
                </div>
              ) : (
                <button 
                  className={`add-to-cart-btn ${isAddingToCart ? 'adding' : ''}`}
                  onClick={addToCart}
                  disabled={isAddingToCart}
                >
                  {isAddingToCart ? (
                    <>Adding <i className="fas fa-circle-notch fa-spin"></i></>
                  ) : (
                    <>Add to Cart <i className="fas fa-cart-plus"></i></>
                  )}
                </button>
              )}
            </div>
          ) : (
            <button className="add-to-cart-btn disabled" disabled>
              Unavailable <i className="fas fa-ban"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuItem;
