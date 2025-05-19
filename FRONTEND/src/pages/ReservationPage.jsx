import { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import { getAllTables, getAvailableTables, createReservation } from '../utils/api';
import '../styles/ReservationPage.css';

const ReservationPage = () => {  // Form state - remove contact information fields
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    table: '',
    occasion: '',
    specialRequests: '',
    duration: '60' // Default duration of 60 minutes
  });

  // States for form handling
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState({});
  const [availableTimes, setAvailableTimes] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);
  const [allTables, setAllTables] = useState([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  
  // Add state for user data
  const [userData, setUserData] = useState(null);

  // Add state for authentication modal
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Prefill user data if logged in
  useEffect(() => {
    const userProfile = JSON.parse(localStorage.getItem('user')) || {};
    if (userProfile) {
      setUserData(userProfile);
    }
    
    // Fetch all tables from the backend
    const fetchTables = async () => {
      try {
        setIsLoadingTables(true);
        const tablesData = await getAllTables();
        console.log("Fetched tables:", tablesData); 
        setAllTables(tablesData);
        setIsLoadingTables(false);
      } catch (error) {
        console.error('Error fetching tables:', error);
        setSubmitError('Error loading tables. Please try again.');
        setIsLoadingTables(false);
      }
    };
    
    fetchTables();
  }, []);

  // Generate available times for selected date
  useEffect(() => {
    if (formData.date) {
      // Generate time slots
      const times = generateTimeSlots(formData.date);
      setAvailableTimes(times);
    }
  }, [formData.date]);
  
  // Fetch available tables when date and time are selected
  useEffect(() => {
    if (formData.date && formData.time) {
      fetchAvailableTables(formData.date, formData.time);
    }
  }, [formData.date, formData.time]);

  // Fetch available tables from the API
  const fetchAvailableTables = async (date, time) => {
    try {
      setIsLoadingTables(true);
      setSubmitError(''); // Clear any previous errors
      
      // Create an ISO datetime string by combining date and time
      const [hours, minutes] = time.split(':');
      const dateObj = new Date(date);
      dateObj.setHours(parseInt(hours, 10));
      dateObj.setMinutes(parseInt(minutes, 10));
      
      const isoDateTime = dateObj.toISOString();
      
      // Call the API to get available tables
      const availableTablesData = await getAvailableTables(isoDateTime);
      
      // Filter tables that are available - ONLY include tables marked as available
      const filteredTables = availableTablesData.filter(table => table.available === true);
      
      console.log(`Found ${filteredTables.length} available tables out of ${availableTablesData.length} total tables`);
      
      // If no tables are available, show a message
      if (filteredTables.length === 0) {
        setSubmitError('No tables are available for the selected date and time. Please choose a different time or date.');
      }
      
      setAvailableTables(filteredTables);
      
      // Reset table selection if the user's previously selected table is no longer available
      if (formData.table) {
        const isSelectedTableAvailable = filteredTables.some(table => 
          table.table_no.toString() === formData.table
        );
        
        if (!isSelectedTableAvailable) {
          setFormData(prev => ({
            ...prev,
            table: ''
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching available tables:', error);
      // Just show the tables we already fetched from getAllTables instead of showing an error
      // This way user can still make reservations even if availability check fails
      setAvailableTables(allTables.map(table => ({...table, available: true})));
    } finally {
      setIsLoadingTables(false);
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

  // Generate available dates (today + next 30 days)
  const generateAvailableDates = () => {
    const today = new Date();
    const minDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Calculate date 30 days from now
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 30);
    
    return {
      min: minDate,
      max: maxDate.toISOString().split('T')[0]
    };
  };

  const availableDates = generateAvailableDates();

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    
    // Only validate reservation details
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.time) newErrors.time = 'Time is required';
    if (!formData.table) newErrors.table = 'Table selection is required';
    
    return newErrors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is logged in (token exists)
    const token = localStorage.getItem('token');
    if (!token) {
      // If not logged in, show auth modal instead of submitting
      setShowAuthModal(true);
      return;
    }
    
    // Validate form
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Double-check availability just before submission
    if (formData.date && formData.time && formData.table) {
      try {
        setIsSubmitting(true); // Start loading state early for better UX
        
        // Create an ISO datetime string by combining date and time
        const [hours, minutes] = formData.time.split(':');
        const dateObj = new Date(formData.date);
        dateObj.setHours(parseInt(hours, 10));
        dateObj.setMinutes(parseInt(minutes, 10));
        
        const isoDateTime = dateObj.toISOString();
        console.log(`Final availability check for table ${formData.table} at ${isoDateTime}`);
        
        // Get latest availability data
        const availableTablesData = await getAvailableTables(isoDateTime);
        
        // Find the selected table in the results
        const selectedTable = availableTablesData.find(
          table => table.table_no.toString() === formData.table
        );
        
        // If table is not available, show error and abort submission
        if (!selectedTable || !selectedTable.available) {
          // Create a clear error message
          const timeDisplay = formatTimeDisplay(formData.time);
          const dateDisplay = new Date(formData.date).toLocaleDateString();
          const tableNo = formData.table;
          
          setSubmitError(`Sorry, Table ${tableNo} is already reserved on ${dateDisplay} at ${timeDisplay}. Please select a different table or choose another time.`);
          
          setIsSubmitting(false);
          await fetchAvailableTables(formData.date, formData.time);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      } catch (error) {
        console.warn('Error during final availability check:', error);
        // Continue with submission even if this check fails - the server will validate
      }
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // Prepare data for API
      // Create a date object for the reservation date and time
      const [hours, minutes] = formData.time.split(':');
      const reservationDate = new Date(formData.date);
      reservationDate.setHours(parseInt(hours, 10));
      reservationDate.setMinutes(parseInt(minutes, 10));
      
      // Get user ID if logged in
      const userId = userData?.id || null;
        const reservationData = {
        user_id: userId,
        table_no: parseInt(formData.table, 10),
        date_time: reservationDate.toISOString(),
        special_requests: formData.occasion 
          ? `Occasion: ${formData.occasion}. ${formData.specialRequests || ''}`
          : formData.specialRequests || '',
        duration: parseInt(formData.duration, 10) || 60
      };
      
      // Call API to create reservation
      const response = await createReservation(reservationData);
      
      // Reservation successful
      setSubmitSuccess(true);
        // Reset form
      setFormData({
        date: '',
        time: '',
        table: '',
        occasion: '',
        specialRequests: '',
        duration: '60'
      });
      
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (error) {
      console.error('Reservation error:', error);
      
      // Display the error message prominently
      setSubmitError(error.message || 'An error occurred while making your reservation. Please try again.');
      
      // If there was an error, refresh the available tables list
      if (formData.date && formData.time) {
        await fetchAvailableTables(formData.date, formData.time);
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle navigation to login/signup pages
  const handleAuthNavigation = (path) => {
    if (window.navigateTo) {
      window.navigateTo(path);
    } else {
      window.location.href = path;
    }
  };

  // Find the selected table's information
  const getSelectedTableInfo = () => {
    return allTables.find(table => table.table_no.toString() === formData.table);
  };

  // Format time for display (convert 24h to 12h format)
  const formatTimeDisplay = (time24h) => {
    if (!time24h) return '';
    
    const [hours, minutes] = time24h.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="reservation-page">
      <div className="reservation-header">
        <div className="reservation-overlay"></div>
        <div className="reservation-content">
          <h2>Reserve a Table</h2>
          <p>Experience the perfect dining atmosphere at VANNI INN</p>
        </div>
      </div>
      
      <div className="reservation-container">
        {submitSuccess ? (
          <div className="reservation-success">
            <div className="success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h3>Reservation Confirmed!</h3>
            <p>Thank you for your reservation. We're looking forward to serving you.</p>
            <p className="confirmation-details">
              A confirmation email has been sent to <strong>{userData?.email}</strong>.
            </p>
            <button 
              className="back-to-home-btn"
              onClick={() => window.navigateTo ? window.navigateTo('/') : window.location.href = '/'}
            >
              Return to Home
            </button>
          </div>
        ) : (
          <div className="reservation-form-container">
            <h1>Make a Reservation</h1>
            
            {submitError && (
              <div className="reservation-error-message">
                <i className="fas fa-exclamation-triangle"></i>
                <span>{submitError}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="reservation-form">
              {/* Contact information section removed */}
              
              <div className="form-section">
                <h3>Reservation Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="date">Date</label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      min={availableDates.min}
                      max={availableDates.max}
                      className={errors.date ? 'error' : ''}
                    />
                    {errors.date && <span className="error-text">{errors.date}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="time">Time</label>
                    <select
                      id="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      className={errors.time ? 'error' : ''}
                      disabled={!formData.date}
                    >
                      <option value="">Select a time</option>
                      {availableTimes.map((time, index) => (
                        <option key={index} value={time}>
                          {formatTimeDisplay(time)}
                        </option>
                      ))}
                    </select>
                    {errors.time && <span className="error-text">{errors.time}</span>}
                    {!formData.date && <span className="help-text">Please select a date first</span>}
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group table-selection">
                    <label htmlFor="table">Select a Table</label>
                    <select
                      id="table"
                      name="table"
                      value={formData.table}
                      onChange={handleChange}
                      className={errors.table ? 'error' : ''}
                      disabled={!formData.time || isLoadingTables}
                    >
                      <option value="">Choose a table</option>
                      {isLoadingTables ? (
                        <option value="" disabled>Loading available tables...</option>
                      ) : (
                        formData.date && formData.time ? 
                          availableTables.length > 0 ? (
                            // Only show tables that are explicitly marked as available
                            availableTables.map((table) => (
                              <option key={table.table_no} value={table.table_no}>
                                Table {table.table_no} - {table.capacity} {table.capacity === 1 ? 'person' : 'people'} 
                                {table.location ? ` (${table.location})` : ''}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>No tables available at this time</option>
                          )
                        : 
                          allTables.map((table) => (
                            <option key={table.table_no} value={table.table_no}>
                              Table {table.table_no} - {table.capacity} {table.capacity === 1 ? 'person' : 'people'} 
                              {table.location ? ` (${table.location})` : ''}
                            </option>
                          ))
                      )}
                    </select>
                    {errors.table && <span className="error-text">{errors.table}</span>}
                    {formData.date && formData.time && availableTables.length === 0 && (
                      <span className="error-text">No tables are available for the selected time. Please choose another time slot.</span>
                    )}
                    {!formData.time && <span className="help-text">Please select a date and time first</span>
                    }
                    
                    {formData.table && (
                      <div className="table-info">
                        <p className="table-description">
                          {getSelectedTableInfo()?.description || `Table ${formData.table}`}
                        </p>
                        <div className="table-capacity">
                          <i className="fas fa-users"></i> 
                          Up to {getSelectedTableInfo()?.capacity} {getSelectedTableInfo()?.capacity === 1 ? 'person' : 'people'}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="duration">Duration (minutes)</label>
                    <select
                      id="duration"
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                    >
                      <option value="60">1 hour</option>
                      <option value="90">1.5 hours</option>
                      <option value="120">2 hours</option>
                      <option value="150">2.5 hours</option>
                      <option value="180">3 hours</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="occasion">Special Occasion (Optional)</label>
                    <select
                      id="occasion"
                      name="occasion"
                      value={formData.occasion}
                      onChange={handleChange}
                    >
                      <option value="">Select an occasion</option>
                      <option value="birthday">Birthday</option>
                      <option value="anniversary">Anniversary</option>
                      <option value="date">Date Night</option>
                      <option value="business">Business Meal</option>
                      <option value="celebration">Celebration</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="specialRequests">Special Requests (Optional)</label>
                  <textarea
                    id="specialRequests"
                    name="specialRequests"
                    value={formData.specialRequests}
                    onChange={handleChange}
                    placeholder="Please let us know if you have any special requests or dietary restrictions"
                    maxLength="500"
                  ></textarea>
                  <div className="char-count">
                    {formData.specialRequests.length}/500 characters
                  </div>
                </div>
              </div>
              
              <div className="reservation-policy">
                <h4>Reservation Policy</h4>
                <p>
                  Please note that we hold reservations for 15 minutes past the reserved time. 
                  If you're running late, please call us at (123) 456-7890. 
                  For cancellations, please notify us at least 4 hours in advance.
                </p>
              </div>
              
              <button 
                type="submit" 
                className="reservation-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Reservation'}
              </button>
            </form>
          </div>
        )}
        
        <div className="restaurant-info">
          <div className="info-section">
            <h3>Opening Hours</h3>
            <div className="hours-list">
              <div className="hours-item">
                <span>Monday - Friday:</span>
                <span>12:00 PM - 10:00 PM</span>
              </div>
              <div className="hours-item">
                <span>Saturday - Sunday:</span>
                <span>10:00 AM - 11:00 PM</span>
              </div>
            </div>
          </div>
          
          <div className="info-section">
            <h3>Contact Information</h3>
            <p><i className="fas fa-map-marker-alt"></i> Ganavairavar Kovil Lane, Vavuniya, Northern Province 43000</p>
            <p><i className="fas fa-phone"></i> 024 456-7890</p>
            <p><i className="fas fa-envelope"></i> vanniinninfo@gmail.com</p>
          </div>
          
          <div className="info-section">
            <h3>Private Events</h3>
            <p>
              Planning a special event? We offer private dining options for parties, 
              corporate events, and celebrations.
            </p>
            <a href="/contact" className="events-link">
              Contact us for more info
            </a>
          </div>
        </div>
      </div>
      
      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="auth-modal-overlay">
          <div className="auth-modal">
            <div className="auth-modal-header">
              <h3>Login Required</h3>
              <button 
                className="close-modal-btn"
                onClick={() => setShowAuthModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="auth-modal-body">
              <p>Please log in or create an account to complete your reservation.</p>
              <div className="auth-modal-buttons">
                <button 
                  className="login-btn"
                  onClick={() => handleAuthNavigation('/login')}
                >
                  Log In
                </button>
                <button 
                  className="signup-btn"
                  onClick={() => handleAuthNavigation('/signup')}
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
};

export default ReservationPage;
