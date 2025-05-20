import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { 
  getUserProfile, 
  updateUserProfile, 
  getUserReservations, 
  getUserOrders, 
  getOrderDetails,
  updateOrder,
  getAllMenuItems,
  cancelOrder,
  // Add these imports for reservation functionality
  getAllTables,
  getAvailableTables,
  updateReservation,
  cancelReservation
} from '../utils/api';
import '../styles/ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  
  // State for user data
  const [userData, setUserData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: ''
  });
  
  // State for form handling
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  
  // State for orders and reservations
  const [orderHistory, setOrderHistory] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  
  // Add new state for order details modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isViewingOrderDetails, setIsViewingOrderDetails] = useState(false);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editedItems, setEditedItems] = useState([]);
  const [editedDeliveryAddress, setEditedDeliveryAddress] = useState('');
  const [editedSpecialInstructions, setEditedSpecialInstructions] = useState('');
  
  // Add new state for menu items
  const [menuItems, setMenuItems] = useState([]);
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [selectedMenuItemQuantity, setSelectedMenuItemQuantity] = useState(1);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  
  // Add new state for cancellation modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  
  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
          // Redirect to login if not logged in
          navigate('/login', { state: { from: '/profile', message: 'Please login to view your profile' } });
          return;
        }
        
        // Fetch user profile data
        try {
          const data = await getUserProfile();
          setUserData(data);
          setIsLoading(false);
        } catch (err) {
          console.error('Failed to fetch user data:', err);
          
          // If we get unauthorized error, redirect to login
          if (err.message.includes('session has expired') || err.message.includes('token')) {
            // Clear any existing token
            localStorage.removeItem('token');
            // Redirect to login
            navigate('/login', { state: { from: '/profile', message: 'Your session has expired. Please login again.' } });
            return;
          }
          
          setError('Failed to load your profile data. Please try again later.');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err);
        setError('Failed to load your profile data. Please try again later.');
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [navigate]);

  // Fetch reservations when the reservations tab is active
  useEffect(() => {
    if (activeTab === 'reservations') {
      const fetchReservations = async () => {
        try {
          setIsLoadingReservations(true);
          setSubmitError(''); // Clear any previous errors
          console.log('Fetching reservations...');
          const reservationsData = await getUserReservations();
          console.log('Received reservations:', reservationsData);
          // Sort reservations by ID in descending order (newest first)
          const sortedReservations = [...reservationsData].sort((a, b) => b.reserve_id - a.reserve_id);
          setReservations(sortedReservations);
        } catch (err) {
          console.error('Error fetching reservations:', err);
          setSubmitError('Could not load your reservations. Please try again later.');
        } finally {
          setIsLoadingReservations(false);
        }
      };
      fetchReservations();
    }
  }, [activeTab]);
  // Fetch order history when the orders tab is active
  const fetchOrderHistory = async () => {
    try {
      if (activeTab === 'orders') {
        setIsLoading(true);
        setSubmitError(''); // Clear any previous errors
        console.log('Fetching orders...');
        
        // Get the current user information
        const userData = JSON.parse(localStorage.getItem('user')) || {};
        const userId = userData.id || userData.user_id;
        
        if (!userId) {
          console.error('User ID not found in local storage');
          setOrderHistory([]);
          return;
        }
        
        // Get orders for the current user
        const ordersData = await getUserOrders();
        console.log(`Received ${ordersData.length} orders for user ID ${userId}`);
        
        setOrderHistory(Array.isArray(ordersData) ? ordersData : []);
        
        if (Array.isArray(ordersData) && ordersData.length === 0) {
          console.log('No orders found for this user');
        }
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setOrderHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Update useEffect to call fetchOrderHistory when activeTab changes to 'orders'
  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrderHistory();
    }
  }, [activeTab]);

  // Start editing profile
  const handleEditClick = () => {
    setIsEditing(true);
    setEditedData({...userData});
  };
  
  // Cancel editing profile
  const handleCancelClick = () => {
    setIsEditing(false);
    setFormErrors({});
  };
  
  // Handle input changes while editing
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedData({
      ...editedData,
      [name]: value
    });
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  // Validate form before submission
  const validateForm = () => {
    const errors = {};
    // First name validation
    if (!editedData.first_name?.trim()) {
      errors.first_name = 'First name is required';
    }
    // Last name validation
    if (!editedData.last_name?.trim()) {
      errors.last_name = 'Last name is required';
    }
    // Email validation
    if (!editedData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(editedData.email)) {
      errors.email = 'Email is invalid';
    }
    // Phone number validation
    if (!editedData.phone_number?.trim()) {
      errors.phone_number = 'Phone number is required';
    } else if (!/^\d{10}$/.test(editedData.phone_number.replace(/\D/g, ''))) {
      errors.phone_number = 'Phone number must be 10 digits';
    }
    // Address validation is required but no specific format
    if (!editedData.address?.trim()) {
      errors.address = 'Address is required';
    }
    return errors;
  };

  // Handle save button click
  const handleSaveClick = async () => {
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    try {
      setSubmitError('');
      // Call API to update profile
      const updatedData = await updateUserProfile(editedData);
      
      // Update local state with new data
      setUserData(updatedData);
      
      // Update user data in localStorage if needed
      const storedUser = JSON.parse(localStorage.getItem('user')) || {};
      localStorage.setItem('user', JSON.stringify({
        ...storedUser,
        id: updatedData.user_id,
        first_name: updatedData.first_name,
        last_name: updatedData.last_name,
        name: `${updatedData.first_name} ${updatedData.last_name}`,
        email: updatedData.email
      }));
      
      // Exit edit mode and show success message
      setIsEditing(false);
      setSubmitSuccess(true);
      // Reset success message after a delay
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
      // Dispatch event to update navbar
      window.dispatchEvent(new Event('authChange'));
    } catch (err) {
      console.error('Failed to update profile:', err);
      setSubmitError(err.message || 'Failed to update your profile. Please try again.');
    }
  };

  // Format date for display (YYYY-MM-DD to user-friendly format)
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Format time for display (YYYY-MM-DD to user-friendly format)
  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleTimeString(undefined, options);
  };
  
  // Format price to show as currency
  const formatPrice = (price) => {
    return `LKR ${parseFloat(price).toFixed(2)}`;
  };

  // Add function to open order details modal
  const handleViewOrderDetails = async (order) => {
    try {
      setIsLoading(true);
      // If the order doesn't have items, fetch them
      if (!order.items || order.items.length === 0) {
        try {
          const orderDetails = await getOrderDetails(order.order_id);
          setSelectedOrder({
            ...order, 
            items: orderDetails.items || [],
            delivery_address: orderDetails.delivery_address || order.delivery_address || '',
            special_instructions: orderDetails.special_instructions || order.special_instructions || ''
          });
        } catch (detailsError) {
          console.error('Error fetching detailed order items:', detailsError);
          // If we can't get details, still show what we have
          setSelectedOrder({
            ...order,
            items: [], // Empty array as fallback
            delivery_address: order.delivery_address || '',
            special_instructions: order.special_instructions || ''
          });
        }
      } else {
        setSelectedOrder(order);
      }
      setIsViewingOrderDetails(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setSubmitError('Could not load order details. Please try again.');
      setIsLoading(false);
    }
  };

  // Add state for reservation editing
  const [isEditingReservation, setIsEditingReservation] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [editedReservationData, setEditedReservationData] = useState({});
  const [availableTables, setAvailableTables] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [isLoadingAvailabilities, setIsLoadingAvailabilities] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);

  // Add function to open reservation edit modal
  const handleEditReservation = async (reservation) => {
    try {
      setIsLoadingAvailabilities(true);
      setSelectedReservation(reservation);
      
      // Initialize edited data with current values
      const reservationDate = new Date(reservation.date_time);      setEditedReservationData({
        date: reservationDate.toISOString().split('T')[0],
        time: `${reservationDate.getHours()}:${String(reservationDate.getMinutes()).padStart(2, '0')}`,
        table_no: reservation.table_no,
        special_requests: reservation.special_requests || '',
        duration: reservation.duration || '60'
      });
      
      // Generate available times
      const times = generateTimeSlots(reservationDate.toISOString().split('T')[0]);
      setAvailableTimes(times);
      
      // Fetch available tables
      try {
        const tablesData = await getAllTables();
        console.log("Fetched tables for editing:", tablesData);
        setAvailableTables(tablesData);
      } catch (tablesError) {
        console.error("Error fetching tables:", tablesError);
        setSubmitError("Could not load tables. Please try again.");
      }
      
      setShowReservationModal(true);
      setIsLoadingAvailabilities(false);
    } catch (err) {
      console.error('Error preparing reservation edit:', err);
      setSubmitError('Could not load reservation details. Please try again.');
      setIsLoadingAvailabilities(false);
    }
  };

  // Generate time slots (11:00 AM to 9:00 PM, 30-minute intervals)
  const generateTimeSlots = (selectedDate) => {
    const slots = [];
    const currentDate = new Date();
    const reservationDate = new Date(selectedDate);
    
    // Check if selected date is today
    const isToday = 
      currentDate.getDate() === reservationDate.getDate() &&
      currentDate.getMonth() === reservationDate.getMonth() &&
      currentDate.getFullYear() === reservationDate.getFullYear();
    
    // Restaurant hours
    let startHour = 11; // 11:00 AM
    const endHour = 21; // 9:00 PM
    
    // If today, only show times after current time plus 1 hour buffer
    if (isToday) {
      const currentHour = currentDate.getHours();
      startHour = Math.max(startHour, currentHour + 1);
    }
    
    for (let hour = startHour; hour < endHour; hour++) {
      // Add half-hour slots
      slots.push(`${hour}:00`);
      slots.push(`${hour}:30`);
    }
    
    return slots;
  };

  // Handle change in reservation edit form
  const handleReservationFormChange = (e) => {
    const { name, value } = e.target;
    setEditedReservationData({
      ...editedReservationData,
      [name]: value
    });
  };

  // Handle reservation update submission
  const handleUpdateReservation = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      setSubmitError('');
      
      // Check if user is logged in
      const token = localStorage.getItem('token');
      if (!token) {
        setSubmitError('You must be logged in to update a reservation');
        setIsLoading(false);
        return;
      }
      
      // Get user data for logging
      const userData = JSON.parse(localStorage.getItem('user')) || {};
      console.log('Current user:', userData);
      
      // Create a date object for the reservation date and time
      const [hours, minutes] = editedReservationData.time.split(':');
      const reservationDate = new Date(editedReservationData.date);
      reservationDate.setHours(parseInt(hours, 10));
      reservationDate.setMinutes(parseInt(minutes, 10));
      
      // Prepare data for API
      const updatedReservationData = {
        table_no: parseInt(editedReservationData.table_no, 10),
        date_time: reservationDate.toISOString(),
        special_requests: editedReservationData.special_requests || '',
        user_id: userData.id || userData.user_id // Include user_id for verification
      };
      
      console.log('Updating reservation with data:', updatedReservationData);
      console.log('Reservation ID:', selectedReservation.reserve_id);
      
      // Call API to update reservation
      await updateReservation(selectedReservation.reserve_id, updatedReservationData);
      
      // Close modal and refresh reservations
      setShowReservationModal(false);
      setSelectedReservation(null);
      
      // Refresh the reservations list
      const refreshedReservations = await getUserReservations();
      setReservations(refreshedReservations);
      
      setIsLoading(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating reservation:', err);
      setSubmitError(err.message || 'Failed to update reservation. Please try again.');
      setIsLoading(false);
    }
  };

  // Add function to close reservation modal
  const handleCloseReservationModal = () => {
    setShowReservationModal(false);
    setSelectedReservation(null);
    setEditedReservationData({});
  };

  // Add function to format time for display (convert 24h to 12h format)
  const formatTimeDisplay = (time24h) => {
    if (!time24h) return '';
    
    const [hours, minutes] = time24h.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
  };
  
  // REPLACE the existing handleCancelReservation function with this implementation
  const handleCancelReservation = async (reservationId) => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      try {
        setIsLoadingReservations(true);
        setSubmitError('');
        
        // Call API to cancel reservation
        await cancelReservation(reservationId);
        
        // Update UI by removing the cancelled reservation
        setReservations(prev => prev.filter(res => res.reserve_id !== reservationId));
        
        setIsLoadingReservations(false);
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
      } catch (err) {
        console.error('Failed to cancel reservation:', err);
        setIsLoadingReservations(false);
        setSubmitError(err.message || 'Failed to cancel reservation. Please try again.');
        setTimeout(() => setSubmitError(''), 5000);
      }
    }
  };

  // Add function to close order details modal
  const handleCloseOrderDetails = () => {
    setIsViewingOrderDetails(false);
    setIsEditingOrder(false);
    setSelectedOrder(null);
    setEditedItems([]);
  };

  // Add function to start editing an order
  const handleEditOrder = () => {
    setIsEditingOrder(true);
    setEditedItems(selectedOrder.items.map(item => ({...item})));
    setEditedDeliveryAddress(selectedOrder.delivery_address || '');
    setEditedSpecialInstructions(selectedOrder.special_instructions || '');
    
    // Fetch menu items for adding new items
    fetchMenuItems();
  };
  
  // Add function to fetch menu items
  const fetchMenuItems = async () => {
    try {
      setIsLoadingMenu(true);
      const data = await getAllMenuItems();
      setMenuItems(data);
      setIsLoadingMenu(false);
    } catch (err) {
      console.error('Error fetching menu items:', err);
      setIsLoadingMenu(false);
    }
  };
  
  // Add function to handle adding a new item to the order
  const handleAddNewItem = () => {
    setIsAddingNewItem(true);
    setSelectedMenuItem(null);
    setSelectedMenuItemQuantity(1);
  };
  
  // Add function to confirm adding the selected item
  const handleConfirmAddItem = () => {
    if (!selectedMenuItem) return;
    
    const newItem = {
      menu_id: selectedMenuItem.menu_id,
      menu_name: selectedMenuItem.menu_name,
      price: selectedMenuItem.price,
      quantity: selectedMenuItemQuantity
    };
    
    setEditedItems([...editedItems, newItem]);
    setIsAddingNewItem(false);
    setSelectedMenuItem(null);
    setSelectedMenuItemQuantity(1);
  };
  
  // Add function to cancel adding a new item
  const handleCancelAddItem = () => {
    setIsAddingNewItem(false);
    setSelectedMenuItem(null);
    setSelectedMenuItemQuantity(1);
  };

  // Add function to update item quantity
  const handleUpdateItemQuantity = (itemIndex, newQuantity) => {
    if (newQuantity < 1) return;
    const updatedItems = [...editedItems];
    updatedItems[itemIndex].quantity = newQuantity;
    setEditedItems(updatedItems);
  };

  // Add function to remove item from order
  const handleRemoveItem = (itemIndex) => {
    const updatedItems = editedItems.filter((_, index) => index !== itemIndex);
    setEditedItems(updatedItems);
  };

  // Add function to save edited order
  const handleSaveOrder = async () => {
    try {
      setIsLoading(true);
      setSubmitError('');
      
      // Calculate new total
      const newTotal = editedItems.reduce(
        (sum, item) => sum + (item.price * item.quantity), 
        0
      );
      
      // Prepare updated order data
      const updatedOrderData = {
        items: editedItems,
        total_amount: newTotal,
        order_type: selectedOrder.order_type,
        delivery_address: editedDeliveryAddress,
        special_instructions: editedSpecialInstructions
      };
      
      // Call the API to update the order
      const response = await updateOrder(selectedOrder.order_id, updatedOrderData);
      console.log('Order updated successfully:', response);
      
      // Update the order in the local state
      const updatedOrder = {
        ...selectedOrder,
        items: editedItems,
        total_amount: newTotal,
        delivery_address: editedDeliveryAddress,
        special_instructions: editedSpecialInstructions
      };
      const updatedOrderHistory = orderHistory.map(order => 
        order.order_id === selectedOrder.order_id ? updatedOrder : order
      );
      
      setOrderHistory(updatedOrderHistory);
      setSelectedOrder(updatedOrder);
      setIsEditingOrder(false);
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error updating order:', err);
      setSubmitError('Failed to update order. Please try again.');
      setIsLoading(false);
    }
  };

  // Add function to cancel editing an order
  const handleCancelEdit = () => {
    setIsEditingOrder(false);
    setEditedItems([]);
  };

  // Update the handleCancelOrder function to show the modal
  const handleCancelOrder = (orderId) => {
    setCancelOrderId(orderId);
    setShowCancelModal(true);
  };

  // Add function to confirm order cancellation
  const confirmCancelOrder = async () => {
    try {
      setIsLoading(true);
      setSubmitError('');
      
      // Call the cancelOrder API without the reason parameter
      await cancelOrder(cancelOrderId);
      
      // Update the order status in the local state
      const updatedOrderHistory = orderHistory.map(order => 
        order.order_id === cancelOrderId 
          ? {...order, order_status: 'Cancelled'} 
          : order
      );
      setOrderHistory(updatedOrderHistory);
      
      // If the selected order is the one being cancelled, update it too
      if (selectedOrder && selectedOrder.order_id === cancelOrderId) {
        setSelectedOrder({...selectedOrder, order_status: 'Cancelled'});
      }
      
      // Close the modal and reset state
      setShowCancelModal(false);
      setCancelOrderId(null);
      
      setIsLoading(false);
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error cancelling order:', err);
      setSubmitError(err.message || 'Failed to cancel order. Please try again.');
      setIsLoading(false);
      
      // Close the modal even if there's an error
      setShowCancelModal(false);
      setCancelOrderId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-page">
        <div className="profile-container loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your profile...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-container error-container">
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            <p>{error}</p>
            <button onClick={() => navigate('/')}>Return to Home</button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-overlay"></div>
        <div className="profile-content">
          <h2>My Account</h2>
          <p>Manage your profile, orders, and reservations</p>
        </div>
      </div>
      
      <div className="profile-container">
        <div className="profile-tabs">
          <button 
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <i className="fas fa-user"></i> Profile
          </button>
          <button 
            className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <i className="fas fa-shopping-bag"></i> Order History
          </button>
          <button 
            className={`tab-button ${activeTab === 'reservations' ? 'active' : ''}`}
            onClick={() => setActiveTab('reservations')}
          >
            <i className="fas fa-calendar-alt"></i> Reservations
          </button>
        </div>
        
        <div className="profile-content-area">
          {submitSuccess && (
            <div className="success-message">
              <i className="fas fa-check-circle"></i>
              <span>Profile updated successfully!</span>
            </div>
          )}
          
          {submitError && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i>
              <span>{submitError}</span>
            </div>
          )}
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="profile-tab-content">
              <h3>Personal Information</h3>
              
              {!isEditing ? (
                <div className="profile-info">
                  <div className="info-row">
                    <div className="info-label">Name</div>
                    <div className="info-value">{userData.first_name} {userData.last_name}</div>
                  </div>
                  <div className="info-row">
                    <div className="info-label">Email</div>
                    <div className="info-value">{userData.email}</div>
                  </div>
                  <div className="info-row">
                    <div className="info-label">Phone</div>
                    <div className="info-value">{userData.phone_number}</div>
                  </div>
                  <div className="info-row">
                    <div className="info-label">Address</div>
                    <div className="info-value">{userData.address || 'Not provided'}</div>
                  </div>
                  
                  <button 
                    className="edit-profile-btn" 
                    onClick={handleEditClick}
                  >
                    <i className="fas fa-edit"></i> Edit Profile
                  </button>
                </div>
              ) : (
                <div className="profile-edit-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="first_name">First Name</label>
                      <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={editedData.first_name || ''}
                        onChange={handleChange}
                        className={formErrors.first_name ? 'error' : ''}
                      />
                      {formErrors.first_name && <span className="error-text">{formErrors.first_name}</span>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="last_name">Last Name</label>
                      <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={editedData.last_name || ''}
                        onChange={handleChange}
                        className={formErrors.last_name ? 'error' : ''}
                      />
                      {formErrors.last_name && <span className="error-text">{formErrors.last_name}</span>}
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="email">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={editedData.email || ''}
                        onChange={handleChange}
                        className={formErrors.email ? 'error' : ''}
                      />
                      {formErrors.email && <span className="error-text">{formErrors.email}</span>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="phone_number">Phone Number</label>
                      <input
                        type="tel"
                        id="phone_number"
                        name="phone_number"
                        value={editedData.phone_number || ''}
                        onChange={handleChange}
                        className={formErrors.phone_number ? 'error' : ''}
                        placeholder="e.g., 1234567890"
                      />
                      {formErrors.phone_number && <span className="error-text">{formErrors.phone_number}</span>}
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="address">Address</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={editedData.address || ''}
                      onChange={handleChange}
                      className={formErrors.address ? 'error' : ''}
                    />
                    {formErrors.address && <span className="error-text">{formErrors.address}</span>}
                  </div>
                  
                  <div className="form-actions">
                    <button 
                      className="save-btn" 
                      onClick={handleSaveClick}
                    >
                      Save Changes
                    </button>
                    <button 
                      className="cancel-btn" 
                      onClick={handleCancelClick}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              <div className="account-security">
                <h3>Account Security</h3>
                <button className="change-password-btn">
                  <i className="fas fa-lock"></i> Change Password
                </button>
              </div>
            </div>
          )}
          
          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="orders-tab-content">
              <h3>Order History</h3>
              {isLoading ? (
                <div className="loading-container" style={{ minHeight: '200px' }}>
                  <div className="loading-spinner"></div>
                  <p>Loading your orders...</p>
                </div>
              ) : orderHistory.length === 0 ? (
                <div className="no-data-message">
                  <i className="fas fa-shopping-bag"></i>
                  <p>You haven't placed any orders yet.</p>
                  <button onClick={() => navigate('/menu')}>Browse Menu</button>
                </div>
              ) : (
                <div className="orders-list">
                  <div className="order-list-header">
                    <span className="order-id">Order ID</span>
                    <span className="order-date">Date</span>
                    <span className="order-total">Total</span>
                    <span className="order-status">Status</span>
                    <span className="order-actions">Actions</span>
                  </div>                  {orderHistory.map(order => (
                    <div key={order.order_id} className="order-item">
                      <div className="order-id">#{order.order_id}</div>
                      <div className="order-date">{formatDate(order.created_at)}</div>
                      <div className="order-total">{formatPrice(order.total_amount)}</div>
                      <div className={`order-status status-${(order.kitchen_status === 'Preparing' ? 'confirmed' : order.order_status.toLowerCase().replace(' ', '-'))}`}>
                        {order.kitchen_status === 'Preparing' ? 'Confirmed' : order.order_status}
                      </div>
                      <div className="order-actions">
                        <button 
                          className="view-order-details"
                          onClick={() => handleViewOrderDetails(order)}
                        >
                          <i className="fas fa-eye"></i> View
                        </button>                        {order.order_status === 'Pending' && order.kitchen_status !== 'Preparing' && (
                          <button 
                            className="cancel-order-btn"
                            onClick={() => handleCancelOrder(order.order_id)}
                          >
                            <i className="fas fa-times"></i> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {isViewingOrderDetails && selectedOrder && (
                <div className="modal-overlay">
                  <div className="modal-content order-details-modal">
                    <div className="modal-header">
                      <h2>{isEditingOrder ? 'Edit Order' : 'Order Details'}</h2>
                      <button className="close-btn" onClick={handleCloseOrderDetails}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    <div className="modal-body">
                      <div className="order-details-header">
                        <div className="order-details-info">
                          <p><strong>Order #:</strong> {selectedOrder.order_id}</p>
                          <p><strong>Date:</strong> {formatDate(selectedOrder.created_at)}</p>
                          <p><strong>Status:</strong> <span className={`status-${selectedOrder.kitchen_status === 'Preparing' ? 'confirmed' : selectedOrder.order_status.toLowerCase().replace(' ', '-')}`}>{selectedOrder.kitchen_status === 'Preparing' ? 'Confirmed' : selectedOrder.order_status}</span></p>
                          <p><strong>Type:</strong> {selectedOrder.order_type}</p>
                          
                          {/* Conditional rendering for delivery address */}
                          {selectedOrder.order_type === 'Delivery' && (
                            isEditingOrder ? (
                              <div className="form-group" style={{marginTop: '15px'}}>
                                <label htmlFor="delivery-address"><strong>Delivery Address:</strong></label>
                                <input
                                  id="delivery-address"
                                  type="text"
                                  value={editedDeliveryAddress}
                                  onChange={(e) => setEditedDeliveryAddress(e.target.value)}
                                  placeholder="Enter delivery address"
                                  className="form-control"
                                />
                              </div>
                            ) : (
                              <p><strong>Delivery Address:</strong> {selectedOrder.delivery_address || 'Not provided'}</p>
                            )
                          )}
                          
                          {/* Add special instructions field */}
                          {isEditingOrder ? (
                            <div className="form-group" style={{marginTop: '15px'}}>
                              <label htmlFor="special-instructions"><strong>Special Instructions:</strong></label>
                              <textarea
                                id="special-instructions"
                                value={editedSpecialInstructions}
                                onChange={(e) => setEditedSpecialInstructions(e.target.value)}
                                placeholder="Enter any special instructions"
                                className="form-control"
                                rows="2"
                              />
                            </div>
                          ) : (
                            selectedOrder.special_instructions && (
                              <p><strong>Special Instructions:</strong> {selectedOrder.special_instructions}</p>
                            )
                          )}
                        </div>
                      </div>
                      
                      <h3>Order Items</h3>
                      
                      {isEditingOrder && (
                        <div style={{marginBottom: '15px'}}>
                          <button 
                            className="add-item-btn" 
                            onClick={handleAddNewItem}
                            style={{
                              background: '#d4af37',
                              color: 'white',
                              border: 'none',
                              padding: '8px 15px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '0.9rem'
                            }}
                          >
                            <i className="fas fa-plus"></i> Add New Item
                          </button>
                        </div>
                      )}
                      
                      {/* Add new item panel */}
                      {isEditingOrder && isAddingNewItem && (
                        <div className="add-item-panel" style={{
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          padding: '15px',
                          marginBottom: '20px',
                          backgroundColor: '#f9f9f9'
                        }}>
                          <h4 style={{marginTop: '0', marginBottom: '15px'}}>Add New Item</h4>
                          
                          {isLoadingMenu ? (
                            <div style={{textAlign: 'center', padding: '20px'}}>
                              <div className="loading-spinner" style={{margin: '0 auto 10px'}}></div>
                              <p>Loading menu items...</p>
                            </div>
                          ) : (
                            <>
                              <div className="form-group" style={{marginBottom: '15px'}}>
                                <label htmlFor="menu-item-select" style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>
                                  Select Menu Item:
                                </label>
                                <select 
                                  id="menu-item-select"
                                  value={selectedMenuItem ? selectedMenuItem.menu_id : ""}
                                  onChange={(e) => {
                                    const selected = menuItems.find(item => item.menu_id == e.target.value);
                                    setSelectedMenuItem(selected || null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '5px'
                                  }}
                                >
                                  <option value="">-- Select an item --</option>
                                  {menuItems.map(item => (
                                    <option key={item.menu_id} value={item.menu_id}>
                                      {item.menu_name} - LKR {formatPrice(item.price)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              
                              {selectedMenuItem && (
                                <div className="form-group" style={{marginBottom: '15px'}}>
                                  <label htmlFor="quantity-input" style={{display: 'block', marginBottom: '5px', fontWeight: '500'}}>
                                    Quantity:
                                  </label>
                                  <div style={{display: 'flex', alignItems: 'center'}}>
                                    <button 
                                      onClick={() => setSelectedMenuItemQuantity(prev => Math.max(1, prev - 1))}
                                      style={{
                                        width: '30px',
                                        height: '30px',
                                        background: '#f0f0f0',
                                        border: '1px solid #ddd',
                                        borderRadius: '50%',
                                        cursor: 'pointer'
                                      }}
                                    >-</button>
                                    <span style={{margin: '0 15px', fontWeight: 'bold'}}>{selectedMenuItemQuantity}</span>
                                    <button 
                                      onClick={() => setSelectedMenuItemQuantity(prev => prev + 1)}
                                      style={{
                                        width: '30px',
                                        height: '30px',
                                        background: '#f0f0f0',
                                        border: '1px solid #ddd',
                                        borderRadius: '50%',
                                        cursor: 'pointer'
                                      }}
                                    >+</button>
                                  </div>
                                </div>
                              )}
                              
                              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '15px'}}>
                                <button 
                                  onClick={handleCancelAddItem}
                                  style={{
                                    padding: '8px 15px',
                                    background: '#f8f9fa',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={handleConfirmAddItem}
                                  disabled={!selectedMenuItem}
                                  style={{
                                    padding: '8px 15px',
                                    background: selectedMenuItem ? '#d4af37' : '#cccccc',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: selectedMenuItem ? 'pointer' : 'not-allowed'
                                  }}
                                >
                                  Add to Order
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      
                      <div className="order-items-list">
                        <div className="order-item-header">
                          <span className="item-name">Item</span>
                          <span className="item-price">Price</span>
                          <span className="item-quantity">Quantity</span>
                          <span className="item-total">Total</span>
                          {isEditingOrder && <span className="item-actions">Actions</span>}
                        </div>
                        
                        {(isEditingOrder ? editedItems : selectedOrder.items || []).map((item, index) => (
                          <div key={index} className="order-item-row">
                            <span className="item-name">{item.menu_name}</span>
                            <span className="item-price">{formatPrice(item.price)}</span>
                            
                            {isEditingOrder ? (
                              <span className="item-quantity">
                                <div className="quantity-controls">
                                  <button 
                                    className="qty-btn" 
                                    onClick={() => handleUpdateItemQuantity(index, item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                  >-</button>
                                  <span className="quantity">{item.quantity}</span>
                                  <button 
                                    className="qty-btn" 
                                    onClick={() => handleUpdateItemQuantity(index, item.quantity + 1)}
                                  >+</button>
                                </div>
                              </span>
                            ) : (
                              <span className="item-quantity">{item.quantity}</span>
                            )}
                            <span className="item-total">{formatPrice(item.price * item.quantity)}</span>
                            {isEditingOrder && (
                              <span className="item-actions">
                                <button 
                                  className="remove-item-btn"
                                  onClick={() => handleRemoveItem(index)}
                                  disabled={editedItems.length <= 1} // Prevent removing all items
                                >
                                  <i className="fas fa-trash-alt"></i>
                                </button>
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div className="order-summary">
                        <div className="summary-row">
                          <span>Subtotal</span>
                          <span>{formatPrice(
                            (isEditingOrder ? editedItems : selectedOrder.items || []).reduce(
                              (sum, item) => sum + (item.price * item.quantity), 
                              0
                            )
                          )}</span>
                        </div>
                        
                        {selectedOrder.delivery_fee > 0 && (
                          <div className="summary-row">
                            <span>Delivery Fee</span>
                            <span>{formatPrice(selectedOrder.delivery_fee || 0)}</span>
                          </div>
                        )}
                        
                        {selectedOrder.service_fee > 0 && (
                          <div className="summary-row">
                            <span>Service Fee</span>
                            <span>{formatPrice(selectedOrder.service_fee || 0)}</span>
                          </div>
                        )}
                        
                        <div className="summary-row total">
                          <span>Total</span>
                          <span>{formatPrice(
                            isEditingOrder 
                              ? editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) 
                              : selectedOrder.total_amount
                          )}</span>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      {isEditingOrder ? (
                        <>
                          <button className="save-btn" onClick={handleSaveOrder} disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button className="cancel-btn" onClick={handleCancelEdit}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>                          {selectedOrder.order_status === 'Pending' && selectedOrder.kitchen_status !== 'Preparing' && (
                            <button className="edit-order-btn" onClick={handleEditOrder}>
                              <i className="fas fa-edit"></i> Edit Order
                            </button>
                          )}
                          <button className="close-modal-btn" onClick={handleCloseOrderDetails}>
                            Close
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Reservations Tab */}
          {activeTab === 'reservations' && (
            <div className="reservations-tab-content">
              <h3>Your Reservations</h3>
              {isLoadingReservations ? (
                <div className="loading-container" style={{ minHeight: '200px' }}>
                  <div className="loading-spinner"></div>
                  <p>Loading your reservations...</p>
                </div>
              ) : reservations.length === 0 ? (
                <div className="no-data-message">
                  <i className="fas fa-calendar-alt"></i>
                  <p>You don't have any reservations yet.</p>
                  <button onClick={() => navigate('/reservation')}>Make a Reservation</button>
                </div>
              ) : (
                <div className="reservations-list">
                  <div className="reservation-list-header">                    <span className="reservation-id">Reservation ID</span>
                    <span className="reservation-date">Date</span>
                    <span className="reservation-time">Time</span>
                    <span className="reservation-table">Table</span>
                    <span className="reservation-duration">Duration</span>
                    <span className="reservation-status">Status</span>
                    <span className="reservation-actions">Actions</span>
                  </div>
                  
                  {reservations.map(reservation => {
                    // Ensure reservation status defaults to 'Pending' if not set
                    const status = reservation.status || 'Pending';
                    return (
                      <div key={reservation.reserve_id} className="reservation-item">
                        <div className="reservation-id">#{reservation.reserve_id}</div>                        <div className="reservation-date">{formatDate(reservation.date_time)}</div>
                        <div className="reservation-time">{formatTime(reservation.date_time)}</div>
                        <div className="reservation-guests">Table {reservation.table_no}</div>
                        <div className="reservation-duration">{reservation.duration || 60} min</div>
                        <div className={`reservation-status status-${status.toLowerCase()}`}>
                          {status}
                        </div>
                        <div className="reservation-actions">
                          {reservation.status === 'Pending' && (
                            <>
                              <button 
                                className="edit-reservation-btn"
                                onClick={() => handleEditReservation(reservation)}
                              >
                                <i className="fas fa-edit"></i> Edit
                              </button>
                              <button 
                                className="cancel-reservation-btn"
                                onClick={() => handleCancelReservation(reservation.reserve_id)}
                              >
                                <i className="fas fa-times"></i> Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="new-reservation">
                <button 
                  className="new-reservation-btn" 
                  onClick={() => navigate('/reservation')}
                >
                  <i className="fas fa-plus"></i> New Reservation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Simplified Cancel Order Modal */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Cancel Order</h2>
              <button 
                className="close-btn" 
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelOrderId(null);
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Are you sure you want to cancel this order?</p>
              <p style={{ color: '#666' }}>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="cancel-btn" 
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelOrderId(null);
                }}
                disabled={isLoading}
              >
                No, Keep Order
              </button>
              <button 
                className="edit-order-btn" 
                onClick={confirmCancelOrder}
                style={{ backgroundColor: '#e74c3c' }}
                disabled={isLoading}
              >
                {isLoading ? 'Cancelling...' : 'Yes, Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Inside the render function, add the reservation modal */}
      {showReservationModal && selectedReservation && (
        <div className="modal-overlay">
          <div className="modal-content reservation-edit-modal">
            <div className="modal-header">
              <h2>Edit Reservation</h2>
              <button className="close-btn" onClick={handleCloseReservationModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              {isLoadingAvailabilities ? (
                <div style={{textAlign: 'center', padding: '20px'}}>
                  <div className="loading-spinner" style={{margin: '0 auto 10px'}}></div>
                  <p>Loading reservation details...</p>
                </div>
              ) : (
                <form onSubmit={handleUpdateReservation} className="reservation-edit-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="date">Date</label>
                      <input
                        type="date"
                        id="date"
                        name="date"
                        value={editedReservationData.date}
                        onChange={handleReservationFormChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="time">Time</label>
                      <select
                        id="time"
                        name="time"
                        value={editedReservationData.time}
                        onChange={handleReservationFormChange}
                        required
                      >
                        <option value="">Select a time</option>
                        {availableTimes.map((time, index) => (
                          <option key={index} value={time}>
                            {formatTimeDisplay(time)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="table_no">Table</label>
                      <select
                        id="table_no"
                        name="table_no"
                        value={editedReservationData.table_no}
                        onChange={handleReservationFormChange}
                        required
                      >
                        <option value="">Select a table</option>
                        {availableTables.map((table) => (
                          <option key={table.table_no} value={table.table_no}>
                            Table {table.table_no} - {table.capacity} {table.capacity === 1 ? 'person' : 'people'} 
                            {table.location ? ` (${table.location})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="duration">Duration (minutes)</label>
                      <select
                        id="duration"
                        name="duration"
                        value={editedReservationData.duration || '60'}
                        onChange={handleReservationFormChange}
                        required
                      >
                        <option value="60">1 hour</option>
                        <option value="90">1.5 hours</option>
                        <option value="120">2 hours</option>
                        <option value="150">2.5 hours</option>
                        <option value="180">3 hours</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="special_requests">Special Requests (Optional)</label>
                    <textarea
                      id="special_requests"
                      name="special_requests"
                      value={editedReservationData.special_requests}
                      onChange={handleReservationFormChange}
                      placeholder="Enter any special requests or requirements"
                      rows="3"
                    ></textarea>
                  </div>
                </form>
              )}
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={handleCloseReservationModal}>
                Cancel
              </button>
              <button 
                className="save-btn" 
                onClick={handleUpdateReservation}
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Reservation'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ProfilePage;
