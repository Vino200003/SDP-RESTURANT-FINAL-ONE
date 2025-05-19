import { useState, useEffect, useCallback } from 'react';
import { logoutUser } from '../utils/api';
import { getCartItems } from '../utils/cartApi';
import logo from '../assets/logo.png'; // Import the logo from assets folder
import '../styles/Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [activePage, setActivePage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  // Add state for cart items count - initialized to 0
  const [cartItemsCount, setCartItemsCount] = useState(0);
  // Add loading state to prevent multiple parallel requests
  const [isLoadingCart, setIsLoadingCart] = useState(false);
  
  // Function to get cart items from the database for authenticated users
  // or from localStorage for unauthenticated users
  const fetchCartCount = useCallback(async () => {
    if (isLoadingCart) return; // Prevent multiple parallel requests
    setIsLoadingCart(true);
    console.log('Fetching cart count...');
    
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // User is authenticated, get cart from database
        console.log('User is authenticated, fetching cart from database...');
        const cartData = await getCartItems();
        const count = cartData.reduce((total, item) => total + item.quantity, 0);
        console.log('Retrieved cart from database:', cartData, 'Total count:', count);
        setCartItemsCount(count);
      } else {
        // User is not authenticated, get cart from localStorage
        console.log('User is not authenticated, fetching cart from localStorage...');
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const count = cart.reduce((total, item) => total + item.quantity, 0);
        console.log('Retrieved cart from localStorage:', cart, 'Total count:', count);
        setCartItemsCount(count);
      }
    } catch (error) {
      console.error('Error fetching cart count:', error);
      // Fallback to localStorage on error
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const count = cart.reduce((total, item) => total + item.quantity, 0);
      setCartItemsCount(count);
    } finally {
      setIsLoadingCart(false);
    }
  }, []);  // No dependencies needed as this function doesn't rely on any changing props/state

  // Event handler for cart updates
  const handleCartUpdated = useCallback(() => {
    console.log('Cart updated event received in Navbar');
    fetchCartCount();
  }, [fetchCartCount]);
  
  // Event handler for authentication changes
  const handleAuthChange = useCallback(() => {
    console.log('Auth change event received in Navbar');
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    const wasLoggedIn = isLoggedIn;
    const nowLoggedIn = !!token && !!user;
    
    setIsLoggedIn(nowLoggedIn);
    setUserData(user);
    
    // If login status changed, update cart count from appropriate source
    if (wasLoggedIn !== nowLoggedIn) {
      console.log('Login status changed, refreshing cart count');
      fetchCartCount();
    }
  }, [fetchCartCount, isLoggedIn]);
  // Handle scroll event to change navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 80) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Get active page from URL on mount
    const path = window.location.pathname;
    const currentPage = path === '/' ? 'home' : path.slice(1);
    setActivePage(currentPage);
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    if (token && user) {
      setIsLoggedIn(true);
      setUserData(user);
    }
    
    // Fetch initial cart count
    fetchCartCount();
    
    // Add event listeners
    window.addEventListener('cartUpdated', handleCartUpdated);
    window.addEventListener('authChange', handleAuthChange);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('cartUpdated', handleCartUpdated);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, [fetchCartCount, handleCartUpdated, handleAuthChange]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    // Prevent body scrolling when menu is open
    document.body.style.overflow = isMenuOpen ? 'auto' : 'hidden';
  };

  // Close menu when clicking a link
  const handleLinkClick = (page) => {
    setIsMenuOpen(false);
    document.body.style.overflow = 'auto';
    setActivePage(page);
  };

  // Handle logo image error
  const handleLogoError = () => {
    console.log("Logo image failed to load");
    setLogoError(true);
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logoutUser();
      setIsLoggedIn(false);
      setUserData(null);
      
      // Dispatch auth change event
      window.dispatchEvent(new Event('authChange'));
      
      // Redirect to home page
      if (window.navigateTo) {
        window.navigateTo('/');
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Get first name for display
  const getDisplayName = () => {
    return userData?.name?.split(' ')[0] || 'User';
  };

  return (
    <nav className={scrolled ? 'navbar scrolled' : 'navbar'}>
      <div className="navbar-container">
        <div className="navbar-logo">
          <a href="/" onClick={() => handleLinkClick('home')}>
            <img 
              src={logo} 
              alt="VANNI INN Logo" 
              className="logo-image" 
              onError={handleLogoError}
            />
          </a>
        </div>

        {/* Mobile menu button with improved animation */}
        <div className="menu-icon" onClick={toggleMenu}>
          <div className={`hamburger ${isMenuOpen ? 'active' : ''}`}>
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </div>
        </div>

        {/* Navigation links with active state styling */}
        <ul className={isMenuOpen ? 'nav-menu active' : 'nav-menu'}>
          <li className="nav-item">
            <a 
              href="/" 
              className={`nav-links ${activePage === 'home' ? 'active' : ''}`} 
              onClick={() => handleLinkClick('home')}
            >
              Home
            </a>
          </li>
          <li className="nav-item">
            <a 
              href="/menu" 
              className={`nav-links ${activePage === 'menu' ? 'active' : ''}`} 
              onClick={() => handleLinkClick('menu')}
            >
              Menu
            </a>
          </li>
          <li className="nav-item">
            <a 
              href="/reservation" 
              className={`nav-links ${activePage === 'reservation' ? 'active' : ''}`} 
              onClick={() => handleLinkClick('reservation')}
            >
              Reservations
            </a>
          </li>
          <li className="nav-item">
            <a 
              href="/about" 
              className={`nav-links ${activePage === 'about' ? 'active' : ''}`} 
              onClick={() => handleLinkClick('about')}
            >
              About Us
            </a>
          </li>
          <li className="nav-item">
            <a 
              href="/contact" 
              className={`nav-links ${activePage === 'contact' ? 'active' : ''}`} 
              onClick={() => handleLinkClick('contact')}
            >
              Contact
            </a>
          </li>
          
          {/* Mobile-only auth buttons */}
          <div className="mobile-auth-buttons">
            {isLoggedIn ? (
              <>
                <a 
                  href="/profile" 
                  className="login-button" 
                  onClick={() => handleLinkClick('profile')}
                >
                  <i className="fas fa-user"></i> Profile
                </a>
                <button 
                  className="signup-button"
                  onClick={handleLogout}
                >
                  <i className="fas fa-sign-out-alt"></i> Logout
                </button>
              </>
            ) : (
              <>
                <a 
                  href="/login" 
                  className="login-button" 
                  onClick={() => handleLinkClick('login')}
                >
                  Login
                </a>
                <a 
                  href="/signup" 
                  className="signup-button" 
                  onClick={() => handleLinkClick('signup')}
                >
                  Sign Up
                </a>
              </>
            )}
            <a 
              href="/cart" 
              className="cart-button" 
              onClick={() => handleLinkClick('cart')}
            >
              <i className="fas fa-shopping-cart"></i> Cart
              {cartItemsCount > 0 && <span className="cart-badge mobile-badge">{cartItemsCount}</span>}
            </a>
          </div>
        </ul>

        {/* Desktop auth buttons */}
        <div className="auth-buttons">
          {isLoggedIn ? (
            <>
              <a 
                href="/profile" 
                className="login-button profile-button" 
                onClick={() => setActivePage('profile')}
              >
                <i className="fas fa-user"></i> {getDisplayName()}
              </a>
              <button 
                className="signup-button logout-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <a 
                href="/login" 
                className="login-button" 
                onClick={() => setActivePage('login')}
              >
                Login
              </a>
              <a 
                href="/signup" 
                className="signup-button" 
                onClick={() => setActivePage('signup')}
              >
                Sign Up
              </a>
            </>
          )}
          <a 
            href="/cart" 
            className="cart-button split-cart-button" 
            onClick={() => setActivePage('cart')}
            aria-label="Shopping Cart"
          >
            <div className="cart-icon-container">
              <i className="fas fa-shopping-cart"></i>
            </div>
            <div className="cart-count-container">
              {cartItemsCount}
            </div>
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
