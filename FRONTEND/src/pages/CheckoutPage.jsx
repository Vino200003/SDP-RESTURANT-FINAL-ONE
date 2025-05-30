import { useState, useEffect, useRef } from 'react';
import Footer from '../components/Footer';
import { getUserProfile, getDeliveryZones, getAllTables, getAvailableTablesForNow } from '../utils/api';
import '../styles/CheckoutPage.css';
import '../styles/restaurantClosed.css';

const CheckoutPage = () => {
  // State for checkout data
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    zipCode: '',
    zoneId: '', // Changed from gsDivision to zoneId
    deliveryNotes: '',
    paymentMethod: 'credit-card',
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCVV: '',
    pickupDate: '',
    pickupTime: '',
    tableNo: '' // Add tableNo for dine-in option
  });

  // State for cart and order
  const [cart, setCart] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(50.00);
  const [total, setTotal] = useState(0);
  const [deliveryMethod, setDeliveryMethod] = useState('delivery');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  
  // New state to store user profile data and control address editing
  const [userProfile, setUserProfile] = useState(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  
  // New state for delivery zones
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const deliveryFeeRef = useRef(null);

  // State for available tables
  const [availableTables, setAvailableTables] = useState([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  // Fetch user profile, cart, and delivery zones
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Try to fetch cart items from database first if user is authenticated
      const token = localStorage.getItem('token');
      let cartItems = [];

      try {
        if (token) {
          // Try to load from API first
          try {
            const { getCartItems } = await import('../utils/cartApi');
            cartItems = await getCartItems();
            console.log("Cart items loaded from API:", cartItems);
          } catch (apiError) {
            console.error('Error loading cart from API:', apiError);
            // Fallback to localStorage
            cartItems = JSON.parse(localStorage.getItem('cart')) || [];
          }
        } else {
          // Not authenticated, use localStorage
          cartItems = JSON.parse(localStorage.getItem('cart')) || [];
        }
        
        // If cart is empty, redirect back to cart page
        if (cartItems.length === 0) {
          if (window.navigateTo) {
            window.navigateTo('/cart');
          } else {
            window.location.href = '/cart';
          }
          return;
        }
        
        setCart(cartItems);
      } catch (error) {
        console.error('Error loading cart:', error);
        // Fallback to localStorage
        cartItems = JSON.parse(localStorage.getItem('cart')) || [];
        setCart(cartItems);
      }
      
      // Get delivery method from localStorage (set on the cart page)
      const storedDeliveryMethod = localStorage.getItem('deliveryMethod');
      if (storedDeliveryMethod) {
        setDeliveryMethod(storedDeliveryMethod);
      }
      
      // Fetch delivery zones
      try {
        console.log('Fetching delivery zones...');
        const zones = await getDeliveryZones();
        console.log('Received delivery zones:', zones);
        setDeliveryZones(zones);
            // Get selected zone from localStorage (set on the cart page)
        const storedZoneId = localStorage.getItem('selectedZoneId');
        if (storedZoneId) {
          console.log('Found stored zone ID:', storedZoneId);
          // Update form data with the selected zone
          setFormData(prevData => ({
            ...prevData,
            zoneId: storedZoneId
          }));
          
          // Find the selected zone object
          const selectedZone = zones.find(zone => 
            (zone.id && zone.id === parseInt(storedZoneId)) || 
            (zone.zone_id && zone.zone_id === parseInt(storedZoneId))
          );
          
          if (selectedZone) {
            console.log('Found matching zone:', selectedZone);
            setSelectedZone(selectedZone);
            
            // Update delivery fee based on the selected zone
            if (storedDeliveryMethod !== 'pickup') {
              setDeliveryFee(parseFloat(selectedZone.delivery_fee));
            }
          }
        }      } catch (error) {
        console.error('Error fetching delivery zones:', error);
        
        // Fallback to hardcoded values if API fails
        const fallbackZones = [
          { zone_id: 1, gs_division: 'Vavuniya South', delivery_fee: 5.00, estimated_delivery_time_min: 30 },
          { zone_id: 2, gs_division: 'Vavuniya North', delivery_fee: 6.50, estimated_delivery_time_min: 40 },
          { zone_id: 3, gs_division: 'Vavuniya', delivery_fee: 4.50, estimated_delivery_time_min: 25 },
          { zone_id: 4, gs_division: 'Vengalacheddikulam', delivery_fee: 8.00, estimated_delivery_time_min: 50 },
          { zone_id: 5, gs_division: 'Nedunkeni', delivery_fee: 7.50, estimated_delivery_time_min: 45 },
          { zone_id: 6, gs_division: 'Cheddikulam', delivery_fee: 7.00, estimated_delivery_time_min: 45 }
        ];
        
        console.log('Using fallback delivery zones:', fallbackZones);
        setDeliveryZones(fallbackZones);
        
        // If we have a stored zone ID, find it in our fallback data
        const storedZoneId = localStorage.getItem('selectedZoneId');
        if (storedZoneId) {
          const fallbackSelectedZone = fallbackZones.find(zone => zone.zone_id === parseInt(storedZoneId));
          if (fallbackSelectedZone) {
            setSelectedZone(fallbackSelectedZone);
            if (deliveryMethod === 'delivery') {
              setDeliveryFee(parseFloat(fallbackSelectedZone.delivery_fee));
            }
          }
        }
      }
      
      // Try to fetch user profile data
      try {
        const userData = await getUserProfile();
        setUserProfile(userData);
        
        // Parse address info if it exists as a single string
        if (userData && userData.address) {
          let addressParts = {
            address: userData.address,
            city: '',
            zipCode: ''
          };
          
          // Try to parse address if it's in format "street, city, zip"
          const addressString = userData.address;
          const commaMatches = addressString.match(/,/g);
          
          if (commaMatches && commaMatches.length >= 2) {
            const lastCommaIndex = addressString.lastIndexOf(',');
            const secondLastCommaIndex = addressString.lastIndexOf(',', lastCommaIndex - 1);
            
            addressParts = {
              address: addressString.substring(0, secondLastCommaIndex).trim(),
              city: addressString.substring(secondLastCommaIndex + 1, lastCommaIndex).trim(),
              zipCode: addressString.substring(lastCommaIndex + 1).trim()
            };
          }
          
          setFormData(prevData => ({
            ...prevData,
            ...addressParts
          }));
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Continue without profile data
      }
      
      setIsLoading(false);
    };

    fetchData();
  }, []);

  // Calculate totals whenever cart or delivery method or delivery fee changes
  useEffect(() => {
    const newSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setSubtotal(newSubtotal);
    
    // Calculate service fee as 5% of subtotal
    const newServiceFee = newSubtotal * 0.05;
    setServiceFee(newServiceFee);
    
    // Set delivery fee based on selected method and zone
    if (deliveryMethod === 'pickup' || deliveryMethod === 'dine-in') {
      setDeliveryFee(0);
    }
    // The deliveryFee is already set when the zone is selected
    
    // Calculate new total with service fee
    const newTotal = newSubtotal + newServiceFee + deliveryFee;
    setTotal(newTotal);
  }, [cart, deliveryMethod, deliveryFee]);
  
  // Effect to reset pickup time when date changes
  useEffect(() => {
    // Check if current time is no longer available when date changes
    if (formData.pickupDate && formData.pickupTime) {
      const isCurrentTimeAvailable = isTimeSlotAvailable(formData.pickupTime, formData.pickupDate);
      
      if (!isCurrentTimeAvailable) {
        // Reset pickup time if it's not available for the selected date
        setFormData(prevData => ({
          ...prevData,
          pickupTime: ''
        }));
      }
    }
  }, [formData.pickupDate]);
  
  // Fetch available tables when dine-in is selected
  useEffect(() => {
    if (deliveryMethod === 'dine-in') {
      console.log('Dine-in selected, fetching available tables...');
      fetchAvailableTables();
    }
  }, [deliveryMethod]);// Function to fetch available tables
  const fetchAvailableTables = async () => {
    setIsLoadingTables(true);
    try {
      // Use the new utility function to fetch tables available at the current time
      console.log('Fetching available tables for now...');
      const tables = await getAvailableTablesForNow();
      console.log('Fetched available tables for current time:', tables);
      
      // Tables returned from getAvailableTablesForNow are already filtered for availability
      setAvailableTables(tables);
    } catch (error) {
      console.error('Error fetching available tables:', error);
      // Try a direct API call with full URL in case the utility function is having issues
      try {
        console.log('Attempting direct API call to fetch tables...');
        // Use the full URL directly
        const currentDateTime = new Date().toISOString();
        const directResponse = await fetch(`http://localhost:5000/api/reservations/available-tables?dateTime=${currentDateTime}`);
        console.log('Direct API response status:', directResponse.status);
        
        if (directResponse.ok) {
          const tables = await directResponse.json();
          console.log('Tables from available-tables endpoint:', tables);
          setAvailableTables(tables);
        } else {
          // If direct API call fails, try the regular tables endpoint as fallback
          console.log('Trying regular tables endpoint as fallback...');
          const tablesResponse = await fetch('http://localhost:5000/api/reservations/tables');
          
          if (tablesResponse.ok) {
            const allTables = await tablesResponse.json();
            console.log('All tables from fallback API call:', allTables);
            
            // Filter only available and active tables
            const availableTables = allTables.filter(
              table => (
                (table.current_status === 'Available' || table.status === 'Available') && 
                table.is_active === true
              )
            );
            
            console.log('Available tables after fallback filtering:', availableTables);
            setAvailableTables(availableTables);
          } else {
            throw new Error('All table endpoints failed');
          }
        }
      } catch (apiError) {
        console.error('All API attempts failed:', apiError);
        // Fallback to dummy data
        console.log('Using dummy table data as fallback');
        setAvailableTables([
          { table_no: 1, capacity: 2, status: 'Available' },
          { table_no: 2, capacity: 4, status: 'Available' },
          { table_no: 3, capacity: 6, status: 'Available' },
          { table_no: 4, capacity: 2, status: 'Available' },
          { table_no: 5, capacity: 4, status: 'Available' }
        ]);
      }
    } finally {
      setIsLoadingTables(false);
    }
  };
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
      // Special handling for zoneId
    if (name === 'zoneId') {
      console.log('Zone ID changed to:', value);
      
      const selectedZone = deliveryZones.find(zone => 
        (zone.id && zone.id === parseInt(value)) || 
        (zone.zone_id && zone.zone_id === parseInt(value))
      );
      
      if (selectedZone) {
        console.log('Selected zone found:', selectedZone);
        setSelectedZone(selectedZone);
        
        // Update delivery fee based on the selected zone
        if (deliveryMethod === 'delivery') {
          // Use the delivery fee from the selected zone
          const newDeliveryFee = parseFloat(selectedZone.delivery_fee);
          console.log('Setting new delivery fee:', newDeliveryFee);
          setDeliveryFee(newDeliveryFee);
          
          // Store selected zone ID in localStorage for persistence
          localStorage.setItem('selectedZoneId', value);
          
          // Add highlight effect to the delivery fee
          if (deliveryFeeRef.current) {
            deliveryFeeRef.current.classList.add('highlight');
            setTimeout(() => {
              if (deliveryFeeRef.current) {
                deliveryFeeRef.current.classList.remove('highlight');
              }
            }, 1000);
          }
        }
      } else if (value === '') {
        // Reset selected zone and delivery fee if nothing is selected
        setSelectedZone(null);
        setDeliveryFee(50.00); // Default delivery fee
        localStorage.removeItem('selectedZoneId');
      }
    }
    
    setFormData({
      ...formData,
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

  // Generate time slots for pickup
  const generateTimeSlots = () => {
    const slots = [];
    // Restaurant hours: 11:00 AM to 9:00 PM, 30-minute intervals
    const startHour = 11;
    const endHour = 21; // 9 PM in 24-hour format
    
    for (let hour = startHour; hour < endHour; hour++) {
      // Add half-hour slots
      slots.push(`${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`);
      slots.push(`${hour % 12 || 12}:30 ${hour < 12 ? 'AM' : 'PM'}`);
    }
    
    return slots;
  };
  
  // Available time slots
  const timeSlots = generateTimeSlots();
    // Check if a time slot is available based on the selected date
  const isTimeSlotAvailable = (timeSlot, selectedDate) => {
    // If not today, all slots are available
    if (!selectedDate || selectedDate !== new Date().toISOString().split('T')[0]) {
      return true;
    }
    
    // For today, check if the time has already passed
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Parse the time slot
    const isPM = timeSlot.includes('PM');
    const is12PM = timeSlot.includes('12:') && timeSlot.includes('PM');
    const is12AM = timeSlot.includes('12:') && timeSlot.includes('AM');
    
    const timeMatch = timeSlot.match(/(\d+):(\d+)/);
    if (!timeMatch) return false;
    
    let hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2], 10);
    
    // Convert to 24-hour format
    if (isPM && hour !== 12) {
      hour += 12;
    } else if (is12AM) {
      hour = 0;
    }
    // 12:00 PM is already 12 in 24-hour format, so no adjustment needed for is12PM
    
    console.log(`Time slot: ${timeSlot}, 24hr format: ${hour}:${minute}, Current: ${currentHour}:${currentMinute}`);
    
    // Compare with current time - add a buffer of 30 minutes for order preparation
    const bufferMinutes = 30;
    let bufferHour = currentHour;
    let bufferMinute = currentMinute + bufferMinutes;
    
    // Adjust if buffer minutes exceed 60
    if (bufferMinute >= 60) {
      bufferHour += 1;
      bufferMinute -= 60;
    }
    
    // Check if the time slot is in the past or too soon
    if (hour < bufferHour || (hour === bufferHour && minute < bufferMinute)) {
      console.log(`Time slot ${timeSlot} not available - too soon (with ${bufferMinutes} min buffer)`);
      return false;
    }
    
    return true;
  };
  
  // Generate available dates for pickup (today + next 7 days)
  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Format date as YYYY-MM-DD for the input value
      const formattedDateValue = date.toISOString().split('T')[0];
      
      // Format date for display (e.g., "Monday, July 15")
      const formattedDateDisplay = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
      
      dates.push({
        value: formattedDateValue,
        display: formattedDateDisplay
      });
    }
    
    return dates;
  };
  
  // Available dates
  const availableDates = generateAvailableDates();

  // Validate form before submission
  const validateForm = () => {
    const errors = {};
    
    // Validation based on delivery method
    if (deliveryMethod === 'delivery') {
      if (isEditingAddress) {
        // Only validate address fields if user is editing them
        if (!formData.address.trim()) errors.address = 'Address is required';
        if (!formData.city.trim()) errors.city = 'City is required';
        if (!formData.zipCode.trim()) errors.zipCode = 'ZIP code is required';
      } else if (!userProfile || !userProfile.address) {
        // If not editing but no profile address exists
        errors.address = 'Delivery address is required. Please edit your address.';
      }
      
      // Always validate Zone ID for delivery regardless of editing status
      if (!formData.zoneId) errors.zoneId = 'Delivery zone is required';
    } else if (deliveryMethod === 'pickup') {
      // Validate pickup date and time
      if (!formData.pickupDate) errors.pickupDate = 'Pickup date is required';
      if (!formData.pickupTime) errors.pickupTime = 'Pickup time is required';
    } else if (deliveryMethod === 'dine-in') {
      // Validate table selection for dine-in
      if (!formData.tableNo) errors.tableNo = 'Please select a table';
    }
    
    // Payment method validation
    if (formData.paymentMethod === 'credit-card') {
      if (!formData.cardName.trim()) errors.cardName = 'Name on card is required';
      if (!formData.cardNumber.trim()) errors.cardNumber = 'Card number is required';
      else if (!/^\d{16}$/.test(formData.cardNumber.replace(/\s/g, ''))) 
        errors.cardNumber = 'Card number must be 16 digits';
      if (!formData.cardExpiry.trim()) errors.cardExpiry = 'Expiry date is required';
      else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(formData.cardExpiry)) 
        errors.cardExpiry = 'Use MM/YY format';
      if (!formData.cardCVV.trim()) errors.cardCVV = 'CVV is required';
      else if (!/^\d{3,4}$/.test(formData.cardCVV)) errors.cardCVV = 'CVV must be 3 or 4 digits';
    }
    
    return errors;
  };

  // Format price to always show 2 decimal places
  const formatPrice = (price) => {
    return parseFloat(price).toFixed(2);
  };

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Handle card number formatting
  const handleCardNumberChange = (e) => {
    const formattedValue = formatCardNumber(e.target.value);
    setFormData({
      ...formData,
      cardNumber: formattedValue
    });
    
    if (formErrors.cardNumber) {
      setFormErrors({
        ...formErrors,
        cardNumber: ''
      });
    }
  };

  // Handle delivery method change
  const handleDeliveryMethodChange = (method) => {
    setDeliveryMethod(method);
    
    // Update delivery fee based on method
    if (method === 'pickup' || method === 'dine-in') {
      setDeliveryFee(0);
    } else if (selectedZone) {
      // If returning to delivery and a zone is selected, use its fee
      setDeliveryFee(parseFloat(selectedZone.delivery_fee));
    } else {
      // Default fee if no zone selected
      setDeliveryFee(50.00);
    }
      // Clear method-specific fields and errors when changing methods
    if (method === 'pickup') {
      // Clear table selection when switching to pickup
      setFormData(prevData => ({
        ...prevData,
        tableNo: ''
      }));
      
      setFormErrors(prevErrors => {
        const newErrors = {...prevErrors};
        delete newErrors.address;
        delete newErrors.city;
        delete newErrors.zipCode;
        delete newErrors.zoneId;
        delete newErrors.tableNo;
        return newErrors;
      });
    } else if (method === 'dine-in') {
      // Clear pickup fields when switching to dine-in
      setFormData(prevData => ({
        ...prevData,
        pickupDate: '',
        pickupTime: ''
      }));
      
      setFormErrors(prevErrors => {
        const newErrors = {...prevErrors};
        delete newErrors.address;
        delete newErrors.city;
        delete newErrors.zipCode;
        delete newErrors.zoneId;
        delete newErrors.pickupDate;
        delete newErrors.pickupTime;
        return newErrors;
      });
    } else {
      // Clear pickup and dine-in related fields when switching to delivery
      setFormData(prevData => ({
        ...prevData,
        pickupDate: '',
        pickupTime: '',
        tableNo: ''
      }));
      
      setFormErrors(prevErrors => {
        const newErrors = {...prevErrors};
        delete newErrors.pickupDate;
        delete newErrors.pickupTime;
        delete newErrors.tableNo;
        return newErrors;
      });
    }
    
    // Save the selected delivery method to localStorage
    localStorage.setItem('deliveryMethod', method);
  };

  // Handle toggling address edit mode
  const toggleAddressEdit = () => {
    setIsEditingAddress(!isEditingAddress);
  };

  // Get formatted address from user profile or form data
  const getFormattedAddress = () => {
    if (userProfile && userProfile.address && !isEditingAddress) {
      return userProfile.address;
    } else {
      return formData.address && formData.city && formData.zipCode 
        ? `${formData.address}, ${formData.city}, ${formData.zipCode}`
        : 'No address provided';
    }
  };
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Additional validation for credit card payments
    if (formData.paymentMethod === 'credit-card') {
      // Basic card validation - Luhn algorithm could be added for production
      const cardNumber = formData.cardNumber.replace(/\s/g, '');
      const expiry = formData.cardExpiry.split('/');
      
      if (cardNumber.length !== 16) {
        setFormErrors({...errors, cardNumber: 'Card number must be 16 digits'});
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      
      if (expiry.length !== 2) {
        setFormErrors({...errors, cardExpiry: 'Invalid expiration date'});
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      
      // Check if card is expired
      const currentDate = new Date();
      const expiryMonth = parseInt(expiry[0], 10);
      const expiryYear = parseInt(`20${expiry[1]}`, 10);
      
      if (expiryYear < currentDate.getFullYear() || 
          (expiryYear === currentDate.getFullYear() && expiryMonth < currentDate.getMonth() + 1)) {
        setFormErrors({...errors, cardExpiry: 'Card is expired'});
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    
    setIsSubmitting(true);
    setOrderError('');
    
    try {
      // Get user data from localStorage for contact info
      const userData = JSON.parse(localStorage.getItem('user')) || {};
      const token = localStorage.getItem('token');
      
      if (!token) {
        setOrderError('You must be logged in to place an order');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setIsSubmitting(false);
        return;
      }
      
      // Get the formatted delivery address
      const deliveryAddressToUse = deliveryMethod === 'delivery' ? 
        (isEditingAddress ? `${formData.address}, ${formData.city}, ${formData.zipCode}` : userProfile.address) : '';
      
      // Get the selected delivery zone's gs_division for inclusion in the address
      const selectedZoneGsDivision = selectedZone ? selectedZone.gs_division : '';
      
      // Prepare order data
      const orderData = {
        user_id: userData.id,
        items: cart.map(item => ({
          menu_id: item.menu_id || item.id, // Use menu_id or fallback to id
          quantity: item.quantity,
          price: item.price,
          name: item.name || item.menu_name, // Include item name for reference
          special_instructions: item.special_instructions || ''
        })),
        order_type: deliveryMethod === 'delivery' ? 'Delivery' : 
                   deliveryMethod === 'pickup' ? 'Takeaway' : 'Dine-in',
        order_status: 'Pending',
        subtotal: parseFloat(subtotal.toFixed(2)),
        service_fee: parseFloat(serviceFee.toFixed(2)),
        delivery_fee: parseFloat(deliveryFee.toFixed(2)),
        total_amount: parseFloat(total.toFixed(2)),        payment_method: formData.paymentMethod === 'credit-card' ? 'card' : 'cash',
        // Add card details if paying by credit card
        card_details: formData.paymentMethod === 'credit-card' ? {
          name: formData.cardName,
          // Only send last 4 digits of card for security
          number: formData.cardNumber ? `xxxx-xxxx-xxxx-${formData.cardNumber.replace(/\s/g, '').slice(-4)}` : '',
          expiry: formData.cardExpiry
        } : null,
        delivery_address: deliveryAddressToUse, // Base address
        zone_id: deliveryMethod === 'delivery' ? parseInt(formData.zoneId) : null, // Add zone_id to order
        // Connect both delivery and dine-in instructions to special_instructions field
        special_instructions: formData.deliveryNotes || '',
        table_no: deliveryMethod === 'dine-in' ? parseInt(formData.tableNo) : null,
        pickup_time: deliveryMethod === 'pickup' ? 
          `${formData.pickupDate} ${formData.pickupTime}` : null,
        user_email: userData.email || '',
        user_name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
      };
      
      console.log('Placing order:', orderData);
      
      // Check if all required item fields exist before submitting
      const missingFields = orderData.items.filter(item => !item.menu_id);
      if (missingFields.length > 0) {
        throw new Error('Some items are missing required fields. Please refresh and try again.');
      }
      
      // Check if delivery address is provided for delivery orders
      if (orderData.order_type === 'Delivery' && !orderData.delivery_address) {
        throw new Error('Delivery address is required for delivery orders.');
      }
      
      // Send order to backend API
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });
      
      let errorData;
      if (!response.ok) {
        try {
          errorData = await response.json();
          console.error('Server error response:', errorData);
          throw new Error(errorData.message || `Failed to place order: ${response.status} ${response.statusText}`);
        } catch (jsonError) {
          // If parsing JSON fails, use the raw response
          console.error('Error parsing error response:', jsonError);
          throw new Error(`Failed to place order: ${response.status} ${response.statusText}`);
        }
      }
        const data = await response.json();
      console.log('Order placed successfully:', data);
      
      // Order successful
      setOrderSuccess(true);
      
      // Clear cart from database if user is authenticated
      if (token) {
        try {
          const { clearCart } = await import('../utils/cartApi');
          await clearCart();
        } catch (clearCartError) {
          console.error('Error clearing cart from database:', clearCartError);
          // If clearing from database fails, still clear localStorage
        }
      }
      
      // Clear cart from localStorage
      localStorage.setItem('cart', JSON.stringify([]));
      
      // Dispatch event so navbar can update cart count
      const event = new Event('cartUpdated');
      window.dispatchEvent(event);
      
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (error) {
      console.error('Order placement error:', error);
      setOrderError(error.message || 'An error occurred while placing your order. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <div className="checkout-overlay"></div>
        <div className="checkout-content">
          <h2>Checkout</h2>
          <p>Complete your order details</p>
        </div>
      </div>
      
      <div className="checkout-container">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your order details...</p>
          </div>
        ) : orderSuccess ? (
          <div className="order-success">
            <div className="success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h3>Order Placed Successfully!</h3>
            <p>Thank you for your order. Your order has been received and is being processed.</p>
            <p className="order-number">Order Reference: #{Math.floor(Math.random() * 1000000)}</p>
            <p>We've sent a confirmation email to <strong>{JSON.parse(localStorage.getItem('user'))?.email || 'your email'}</strong>.</p>
            <div className="success-buttons">
              <button 
                className="back-to-home-btn"
                onClick={() => window.navigateTo ? window.navigateTo('/') : window.location.href = '/'}
              >
                Return to Home
              </button>
              <button 
                className="view-orders-btn"
                onClick={() => window.navigateTo ? window.navigateTo('/profile?tab=orders') : window.location.href = '/profile?tab=orders'}
              >
                View Your Orders
              </button>
            </div>
          </div>
        ) : (
          <div className="checkout-content-wrapper">
            {orderError && (
              <div className="error-message order-error">
                {orderError.includes('Restaurant is currently closed') ? (
                  <div className="restaurant-closed-message">
                    <i className="fas fa-clock"></i>
                    <h3>Restaurant is Currently Closed</h3>
                    <p>{orderError}</p>
                    <div className="operating-hours-info">
                      <p>Please note our operating hours and try again during our business hours.</p>
                      <button 
                        className="view-hours-btn"
                        onClick={() => window.navigateTo ? window.navigateTo('/contact') : window.location.href = '/contact'}
                      >
                        View Our Operating Hours
                      </button>
                    </div>
                  </div>
                ) : (
                  orderError
                )}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="checkout-form">
              <div className="checkout-form-container">
                
                <div className="form-section">
                  <h3>Delivery Method</h3>
                  <div className="delivery-toggle checkout-delivery-toggle">
                    <button 
                      type="button"
                      className={`delivery-btn ${deliveryMethod === 'delivery' ? 'active' : ''}`}
                      onClick={() => handleDeliveryMethodChange('delivery')}
                    >
                      <i className="fas fa-truck"></i> Delivery
                    </button>
                    <button 
                      type="button"
                      className={`delivery-btn ${deliveryMethod === 'pickup' ? 'active' : ''}`}
                      onClick={() => handleDeliveryMethodChange('pickup')}
                    >
                      <i className="fas fa-shopping-bag"></i> Pickup
                    </button>
                    <button 
                      type="button"
                      className={`delivery-btn ${deliveryMethod === 'dine-in' ? 'active' : ''}`}
                      onClick={() => handleDeliveryMethodChange('dine-in')}
                    >
                      <i className="fas fa-utensils"></i> Dine-In
                    </button>
                  </div>
                </div>
                
                {deliveryMethod === 'delivery' && (
                  <div className="form-section">
                    <h3>Delivery Address</h3>
                    
                    {!isEditingAddress ? (
                      <div className="saved-address-container">
                        <div className="saved-address">
                          <div className="address-icon">
                            <i className="fas fa-map-marker-alt"></i>
                          </div>
                          <div className="address-details">
                            <p className="address-text">{getFormattedAddress()}</p>
                            {userProfile && userProfile.phone_number && (
                              <p className="address-phone">{userProfile.phone_number}</p>
                            )}
                          </div>
                        </div>
                        <button 
                          type="button" 
                          className="edit-address-btn"
                          onClick={toggleAddressEdit}
                        >
                          <i className="fas fa-edit"></i> Change Address
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="edit-address-header">
                          <p>Enter New Delivery Address</p>
                          <button 
                            type="button" 
                            className="cancel-edit-btn"
                            onClick={toggleAddressEdit}
                          >
                            Cancel
                          </button>
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="address">Street Address</label>
                          <input
                            type="text"
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className={formErrors.address ? 'error' : ''}
                          />
                          {formErrors.address && <span className="error-text">{formErrors.address}</span>}
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="city">City</label>
                            <input
                              type="text"
                              id="city"
                              name="city"
                              value={formData.city}
                              onChange={handleChange}
                              className={formErrors.city ? 'error' : ''}
                            />
                            {formErrors.city && <span className="error-text">{formErrors.city}</span>}
                          </div>
                          <div className="form-group">
                            <label htmlFor="zipCode">ZIP Code</label>
                            <input
                              type="text"
                              id="zipCode"
                              name="zipCode"
                              value={formData.zipCode}
                              onChange={handleChange}
                              className={formErrors.zipCode ? 'error' : ''}
                            />
                            {formErrors.zipCode && <span className="error-text">{formErrors.zipCode}</span>}
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Updated GS Division dropdown to use data from API */}                    <div className="form-group gs-division-container">
                      <label htmlFor="zoneId">Delivery Zone <span className="required">*</span></label>
                      <select
                        id="zoneId"
                        name="zoneId"
                        value={formData.zoneId}
                        onChange={handleChange}
                        className={formErrors.zoneId ? 'error' : ''}
                      >
                        <option value="">Select Delivery Zone</option>
                        {deliveryZones && deliveryZones.length > 0 ? (
                          deliveryZones.map(zone => (
                            <option key={zone.id || zone.zone_id} value={zone.id || zone.zone_id}>
                              {zone.name || zone.gs_division}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>Loading zones...</option>
                        )}
                      </select>
                      {formErrors.zoneId && <span className="error-text">{formErrors.zoneId}</span>}
                      {selectedZone && (
                        <p className="pickup-time-note">
                          Estimated delivery time: {selectedZone.estimated_time || selectedZone.estimated_delivery_time_min} minutes
                        </p>
                      )}
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="deliveryNotes">Delivery Instructions (Optional)</label>
                      <textarea
                        id="deliveryNotes"
                        name="deliveryNotes"
                        value={formData.deliveryNotes}
                        onChange={handleChange}
                        placeholder="e.g., Apartment number, gate code, or special instructions"
                      ></textarea>
                    </div>
                  </div>
                )}
                
                <div className="form-section">
                  <h3>Payment Method</h3>
                  <div className="payment-options">
                    <div className="payment-option">
                      <label className="radio-container">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="credit-card"
                          checked={formData.paymentMethod === 'credit-card'}
                          onChange={handleChange}
                        />
                        <span className="radio-label">Credit/Debit Card</span>
                      </label>
                    </div>
                    
                    <div className="payment-option">
                      <label className="radio-container">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cash"
                          checked={formData.paymentMethod === 'cash'}
                          onChange={handleChange}
                        />
                        <span className="radio-label">Cash on Delivery</span>
                      </label>
                    </div>
                  </div>

                  {formData.paymentMethod === 'credit-card' && (
                    <div className="card-details">
                      <div className="form-group">
                        <label htmlFor="cardName">Name on Card</label>
                        <input
                          type="text"
                          id="cardName"
                          name="cardName"
                          value={formData.cardName}
                          onChange={handleChange}
                          className={formErrors.cardName ? 'error' : ''}
                        />
                        {formErrors.cardName && <span className="error-text">{formErrors.cardName}</span>}
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="cardNumber">Card Number</label>
                        <input
                          type="text"
                          id="cardNumber"
                          name="cardNumber"
                          value={formData.cardNumber}
                          onChange={handleCardNumberChange}
                          className={formErrors.cardNumber ? 'error' : ''}
                          placeholder="1234 5678 9012 3456"
                          maxLength="19"
                        />
                        {formErrors.cardNumber && <span className="error-text">{formErrors.cardNumber}</span>}
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="cardExpiry">Expiry Date</label>
                          <input
                            type="text"
                            id="cardExpiry"
                            name="cardExpiry"
                            value={formData.cardExpiry}
                            onChange={handleChange}
                            className={formErrors.cardExpiry ? 'error' : ''}
                            placeholder="MM/YY"
                            maxLength="5"
                          />
                          {formErrors.cardExpiry && <span className="error-text">{formErrors.cardExpiry}</span>}
                        </div>
                        <div className="form-group">
                          <label htmlFor="cardCVV">CVV</label>
                          <input
                            type="text"
                            id="cardCVV"
                            name="cardCVV"
                            value={formData.cardCVV}
                            onChange={handleChange}
                            className={formErrors.cardCVV ? 'error' : ''}
                            placeholder="123"
                            maxLength="4"
                          />
                          {formErrors.cardCVV && <span className="error-text">{formErrors.cardCVV}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* The pickup section was incorrectly nested */}
                {deliveryMethod === 'pickup' && (
                  <div className="form-section">
                    <h3>Pickup Details</h3>
                    <p className="pickup-info">
                      Please select your preferred pickup date and time. Our restaurant is open daily from 11:00 AM to 9:00 PM.
                    </p>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="pickupDate">Pickup Date</label>
                        <select
                          id="pickupDate"
                          name="pickupDate"
                          value={formData.pickupDate}
                          onChange={handleChange}
                          className={formErrors.pickupDate ? 'error' : ''}
                        >
                          <option value="">Select Date</option>
                          {availableDates.map((date, index) => (
                            <option key={index} value={date.value}>
                              {date.display}
                            </option>
                          ))}
                        </select>
                        {formErrors.pickupDate && <span className="error-text">{formErrors.pickupDate}</span>}
                      </div>
                      <div className="form-group">
                        <label htmlFor="pickupTime">Pickup Time</label>
                        <select
                          id="pickupTime"
                          name="pickupTime"
                          value={formData.pickupTime}
                          onChange={handleChange}
                          className={formErrors.pickupTime ? 'error' : ''}
                        >
                          <option value="">Select Time</option>
                          {timeSlots.map((time, index) => {
                            const isAvailable = isTimeSlotAvailable(time, formData.pickupDate);
                            return isAvailable ? (
                              <option key={index} value={time}>
                                {time}
                              </option>
                            ) : null;
                          })}
                        </select>
                        {formErrors.pickupTime && <span className="error-text">{formErrors.pickupTime}</span>}
                        {formData.pickupDate === new Date().toISOString().split('T')[0] && (
                          <p className="pickup-time-note">
                            <i className="fas fa-info-circle"></i> For today, only future time slots are available.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                  {deliveryMethod === 'dine-in' && (
                  <div className="checkout-section">
                    <h3>Table Selection</h3>
                    {isLoadingTables ? (
                      <div className="loading-tables">
                        <div className="loading-spinner small"></div>
                        <p>Loading available tables...</p>
                      </div>
                    ) : (
                      <>                        <div className="form-group">
                          <label htmlFor="tableNo">Select a Table <span className="required">*</span></label>
                          {availableTables && availableTables.length > 0 ? (
                            <>
                              <select
                                id="tableNo"
                                name="tableNo"
                                value={formData.tableNo}
                                onChange={handleChange}
                                className={formErrors.tableNo ? 'error' : ''}
                              >
                                <option value="">-- Select a Table --</option>
                                {availableTables.map(table => (
                                  <option key={table.table_no} value={table.table_no}>
                                    Table {table.table_no} (Seats {table.capacity})
                                  </option>
                                ))}
                              </select>
                              <p className="table-info-text">
                                {formData.tableNo && 
                                  `You've selected Table ${formData.tableNo} for dine-in service. Your food will be served at this table.`
                                }
                              </p>
                            </>
                          ) : (
                            <div className="no-tables-message">
                              <p>No tables are currently available for dine-in. Please try again later or select a different order method.</p>
                              <button 
                                type="button"
                                className="refresh-tables-btn"
                                onClick={fetchAvailableTables}
                              >
                                <i className="fas fa-sync-alt"></i> Refresh Available Tables
                              </button>
                            </div>
                          )}
                          {formErrors.tableNo && <p className="error-message">{formErrors.tableNo}</p>}
                        </div>
                        <div className="form-group">
                          <label htmlFor="deliveryNotes">Special Instructions (Optional)</label>
                          <textarea
                            id="deliveryNotes"
                            name="deliveryNotes"
                            value={formData.deliveryNotes}
                            onChange={handleChange}
                            placeholder="Any special instructions for your dining experience..."
                            rows={3}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
                
              </div>
              
              <div className="order-summary-container">
                <div className="order-summary">
                  <h3>Order Summary</h3>
                  
                  <div className="order-items">
                    {cart.map((item, index) => (
                      <div key={index} className="order-item">
                        <div className="item-quantity">{item.quantity}x</div>
                        <div className="item-name">{item.name}</div>
                        <div className="item-price">LKR {formatPrice(item.price * item.quantity)}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="price-summary">
                    <div className="summary-row">
                      <span>Subtotal</span>
                      <span>LKR {formatPrice(subtotal)}</span>
                    </div>
                    <div className="summary-row">
                      <span>Service Fee (5%)</span>
                      <span>LKR {formatPrice(serviceFee)}</span>
                    </div>                    {deliveryMethod === 'delivery' && (
                      <>
                        <div className="summary-row" ref={deliveryFeeRef}>
                          <span>Delivery Fee</span>
                          <span>LKR {formatPrice(deliveryFee)}</span>
                        </div>                        {selectedZone && (selectedZone.estimated_delivery_time_min || selectedZone.estimated_time) && (
                          <div className="summary-row estimated-time">
                            <span><i className="fas fa-clock"></i> Estimated Delivery Time</span>
                            <span>{selectedZone.estimated_delivery_time_min || selectedZone.estimated_time} minutes</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="summary-row total">
                      <span>Total</span>
                      <span>LKR {formatPrice(total)}</span>
                    </div>
                  </div>
                  
                  <button 
                    type="submit" 
                    className="place-order-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Processing...' : 'Place Order'}
                  </button>
                  
                  <div className="back-to-cart">
                    <a href="/cart" onClick={(e) => {
                      e.preventDefault();
                      if (window.navigateTo) {
                        window.navigateTo('/cart');
                      } else {
                        window.location.href = '/cart';
                      }
                    }}>
                      <i className="fas fa-arrow-left"></i> Back to Cart
                    </a>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default CheckoutPage;
