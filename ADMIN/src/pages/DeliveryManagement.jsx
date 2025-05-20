import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/DeliveryManagement.css';
// Import the delivery service
import * as deliveryService from '../services/deliveryService';

function DeliveryManagement() {
  // State for delivery personnel
  const [deliveryPersonnel, setDeliveryPersonnel] = useState([]);
  const [filteredPersonnel, setFilteredPersonnel] = useState([]);
  
  // State for delivery orders
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  
  // State for delivery zones
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [filteredZones, setFilteredZones] = useState([]);
  
  // Additional state for backend connectivity
  const [backendStatus, setBackendStatus] = useState({
    isChecking: true,
    isConnected: true,
    message: ''
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState('orders');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  
  // Modal state
  const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState(false);
  const [isEditPersonModalOpen, setIsEditPersonModalOpen] = useState(false);
  const [isAssignOrderModalOpen, setIsAssignOrderModalOpen] = useState(false);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false);
  const [isEditZoneModalOpen, setIsEditZoneModalOpen] = useState(false);
  
  // Form state for new delivery person
  const [newPerson, setNewPerson] = useState({
    name: '',
    contact_number: '',
    email: '',
    vehicle_type: 'motorcycle',
    license_number: '',
    status: 'available'
  });
  
  // New zone form state
  const [newZone, setNewZone] = useState({
    name: '',
    description: '',
    delivery_fee: 0,
    estimated_time: 30,
    status: 'active'
  });
  
  // Filter state
  const [filters, setFilters] = useState({
    personnel: {
      search: '',
      status: ''
    },
    orders: {
      search: '',
      status: '',
      kitchenStatus: '',
      date: ''
    },
    zones: {
      search: '',
      status: ''
    }
  });

  // Mock data for delivery personnel (to be replaced with API calls)
  const mockDeliveryPersonnel = [
    { 
      id: 1, 
      name: 'John Doe', 
      contact_number: '077-1234567',
      email: 'john.doe@example.com',
      vehicle_type: 'motorcycle',
      license_number: 'MC12345',
      status: 'available',
      completed_deliveries: 28,
      avg_rating: 4.8,
      joined_date: '2023-01-15'
    },
    { 
      id: 2, 
      name: 'Jane Smith', 
      contact_number: '077-7654321',
      email: 'jane.smith@example.com',
      vehicle_type: 'car',
      license_number: 'CAR7890',
      status: 'on_delivery',
      completed_deliveries: 42,
      avg_rating: 4.5,
      joined_date: '2022-11-20'
    },
    { 
      id: 3, 
      name: 'Kumar Perera', 
      contact_number: '077-5554433',
      email: 'kumar.p@example.com',
      vehicle_type: 'motorcycle',
      license_number: 'MC98765',
      status: 'offline',
      completed_deliveries: 15,
      avg_rating: 4.2,
      joined_date: '2023-05-10'
    }
  ];

  const mockDeliveryOrders = [
    {
      order_id: 1001,
      customer_name: 'Maya Fernando',
      delivery_address: '123 Galle Road, Colombo 04',
      contact_number: '071-1234567',
      order_total: 2450.00,
      order_time: '2023-06-15T14:30:00',
      delivery_status: 'pending',
      assigned_to: null,
      items: [
        { name: 'Chicken Fried Rice', quantity: 2, price: 850.00 },
        { name: 'Vegetable Kottu', quantity: 1, price: 750.00 }
      ]
    },
    {
      order_id: 1002,
      customer_name: 'Arun Perera',
      delivery_address: '45 Duplication Road, Colombo 03',
      contact_number: '071-7894561',
      order_total: 3200.00,
      order_time: '2023-06-15T15:10:00',
      delivery_status: 'on_the_way',
      assigned_to: 2,
      estimated_delivery: '2023-06-15T16:00:00',
      items: [
        { name: 'Tandoori Chicken', quantity: 1, price: 1200.00 },
        { name: 'Garlic Naan', quantity: 4, price: 200.00 },
        { name: 'Butter Chicken', quantity: 1, price: 1000.00 }
      ]
    },
    {
      order_id: 1003,
      customer_name: 'Dinesh Silva',
      delivery_address: '78 Marine Drive, Colombo 06',
      contact_number: '071-4567890',
      order_total: 1850.00,
      order_time: '2023-06-15T13:45:00',
      delivery_status: 'delivered',
      assigned_to: 1,
      delivery_time: '2023-06-15T14:30:00',
      rating: 5,
      items: [
        { name: 'Cheese Pizza', quantity: 1, price: 1200.00 },
        { name: 'Coca Cola', quantity: 2, price: 325.00 }
      ]
    }
  ];

  // Mock data for delivery zones (to be replaced with API call)
  const mockDeliveryZones = [
    {
      id: 1,
      name: 'Colombo Central',
      description: 'Central Colombo area including Fort and Pettah',
      delivery_fee: 150.00,
      estimated_time: 30,
      status: 'active',
      active_orders: 5
    },
    {
      id: 2,
      name: 'Colombo South',
      description: 'Southern suburbs including Dehiwala and Mount Lavinia',
      delivery_fee: 250.00,
      estimated_time: 45,
      status: 'active',
      active_orders: 3
    },
    {
      id: 3,
      name: 'Colombo North',
      description: 'Northern areas including Wattala and Ja-Ela',
      delivery_fee: 300.00,
      estimated_time: 60,
      status: 'inactive',
      active_orders: 0
    }
  ];

  // Simple notification function (to be replaced with toast notifications)
  const notify = (message, type = 'info') => {
    console.log(`[${type}] ${message}`);
    alert(message);
  };

  // Load initial data
  useEffect(() => {
    fetchDeliveryPersonnel();
    fetchDeliveryOrders();
    fetchDeliveryZones();
  }, []);

  // Apply personnel search filter
  useEffect(() => {
    applyPersonnelFilters();
  }, [deliveryPersonnel, filters.personnel]);

  // Apply orders search filter
  useEffect(() => {
    applyOrdersFilters();
  }, [deliveryOrders, filters.orders]);

  // Apply zones filters
  useEffect(() => {
    applyZonesFilters();
  }, [deliveryZones, filters.zones]);

  // Check if backend server is running
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        // For Vite, use import.meta.env instead of process.env
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        // Using AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${apiUrl}/api/health-check`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          setBackendStatus({
            isChecking: false,
            isConnected: true,
            message: ''
          });
        } else {
          setBackendStatus({
            isChecking: false,
            isConnected: false,
            message: 'Backend server returned an error. Please check server logs.'
          });
        }
      } catch (error) {
        console.error('Backend connection check failed:', error);
        setBackendStatus({
          isChecking: false,
          isConnected: false,
          message: 'Cannot connect to the backend server. Please make sure it is running on port 5000.'
        });
      }
    };
    
    checkBackendConnection();
  }, []);

  // Fetch delivery personnel (now using the real API)
  const fetchDeliveryPersonnel = async () => {
    setIsLoading(true);
    try {
      const data = await deliveryService.getAllDeliveryPersonnel();
      setDeliveryPersonnel(data);
      setFilteredPersonnel(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching delivery personnel:', error);
      notify('Failed to load delivery personnel data. Using mock data instead.', 'error');
      // Fallback to mock data in case of error
      setDeliveryPersonnel(mockDeliveryPersonnel);
      setFilteredPersonnel(mockDeliveryPersonnel);
      setIsLoading(false);
    }
  };

  // Fetch delivery orders (using the real API to include kitchen_status)
  const fetchDeliveryOrders = async () => {
    setIsLoading(true);
    try {
      const data = await deliveryService.getDeliveryOrders();
      
      // Make sure kitchen_status is defined for all orders
      const ordersWithKitchenStatus = data.map(order => ({
        ...order,
        kitchen_status: order.kitchen_status || 'Pending'
      }));
      
      setDeliveryOrders(ordersWithKitchenStatus);
      setFilteredOrders(ordersWithKitchenStatus);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching delivery orders:', error);
      notify('Failed to load delivery orders data. Using mock data instead.', 'error');
      
      // Add kitchen_status to the mock data if needed
      const mockWithKitchenStatus = mockDeliveryOrders.map(order => ({
        ...order,
        kitchen_status: order.kitchen_status || 'Pending'
      }));
      
      setDeliveryOrders(mockWithKitchenStatus);
      setFilteredOrders(mockWithKitchenStatus);
      setIsLoading(false);
    }
  };

  // Fetch delivery zones (using mock data for now)
  const fetchDeliveryZones = async () => {
    setIsLoading(true);
    try {
      const data = await deliveryService.getAllDeliveryZones();
      setDeliveryZones(data);
      setFilteredZones(data);
    } catch (error) {
      console.error('Error fetching delivery zones:', error);
      notify('Failed to load delivery zones data. Using mock data instead.', 'error');
      setDeliveryZones(mockDeliveryZones);
      setFilteredZones(mockDeliveryZones);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters to personnel list
  const applyPersonnelFilters = () => {
    const { search, status } = filters.personnel;
    let filtered = [...deliveryPersonnel];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(person => 
        person.name.toLowerCase().includes(searchLower) ||
        person.email.toLowerCase().includes(searchLower) ||
        person.contact_number.includes(search)
      );
    }

    if (status) {
      filtered = filtered.filter(person => person.status === status);
    }

    setFilteredPersonnel(filtered);
  };

  // Apply filters to orders list
  const applyOrdersFilters = () => {
    const { search, status, kitchenStatus, date } = filters.orders;
    let filtered = [...deliveryOrders];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(order => 
        (order.customer_name && order.customer_name.toLowerCase().includes(searchLower)) ||
        (order.zone_name && order.zone_name.toLowerCase().includes(searchLower)) || // Change to search by zone_name
        order.order_id.toString().includes(search)
      );
    }

    if (status) {
      filtered = filtered.filter(order => order.delivery_status === status);
    }
    
    if (kitchenStatus) {
      filtered = filtered.filter(order => order.kitchen_status === kitchenStatus);
    }

    if (date) {
      const filterDate = new Date(date).toDateString();
      filtered = filtered.filter(order => 
        new Date(order.order_time).toDateString() === filterDate
      );
    }

    setFilteredOrders(filtered);
  };

  // Apply filters to zones list
  const applyZonesFilters = () => {
    const { search, status } = filters.zones;
    let filtered = [...deliveryZones];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(zone => 
        zone.name.toLowerCase().includes(searchLower) ||
        zone.description.toLowerCase().includes(searchLower)
      );
    }

    if (status) {
      filtered = filtered.filter(zone => zone.status === status);
    }

    // Sort zones by ID numerically
    filtered.sort((a, b) => {
      // Convert IDs to numbers to ensure proper numeric sorting
      const idA = parseInt(a.id);
      const idB = parseInt(b.id);
      return idA - idB;
    });

    setFilteredZones(filtered);
  };

  // Handle filter changes
  const handleFilterChange = (tab, field, value) => {
    setFilters({
      ...filters,
      [tab]: {
        ...filters[tab],
        [field]: value
      }
    });
  };

  // Update the reset filters function
  const resetFilters = (tab) => {
    setFilters({
      ...filters,
      [tab]: tab === 'personnel' 
        ? { search: '', status: '' }
        : tab === 'zones'
          ? { search: '', status: '' }
          : { search: '', status: '', kitchenStatus: '', date: '' }
    });
  };

  // Handle add person (not needed since we're using staff table, but keep for future use)
  const handleAddPerson = () => {
    notify('Staff members should be added from the Staff Management page', 'info');
    setIsAddPersonModalOpen(false);
  };

  // Update delivery person
  const handleUpdatePerson = () => {
    if (!selectedPerson) return;
    
    // Validate form
    if (!selectedPerson.name || !selectedPerson.contact_number) {
      notify('Name and contact number are required', 'error');
      return;
    }

    // In a real app, this would be an API call
    // await deliveryService.updateDeliveryPerson(selectedPerson.id, selectedPerson);
    
    const updatedPersonnel = deliveryPersonnel.map(person =>
      person.id === selectedPerson.id ? selectedPerson : person
    );

    setDeliveryPersonnel(updatedPersonnel);
    setIsEditPersonModalOpen(false);
    setSelectedPerson(null);
    
    notify('Delivery person updated successfully', 'success');
  };

  // Delete delivery person
  const handleDeletePerson = (id) => {
    // Check if person has assigned orders
    const hasAssignedOrders = deliveryOrders.some(order => 
      order.assigned_to === id && ['pending', 'on_the_way'].includes(order.delivery_status)
    );

    if (hasAssignedOrders) {
      notify('Cannot delete: This person has active delivery orders assigned', 'error');
      return;
    }

    if (window.confirm('Are you sure you want to delete this delivery person?')) {
      // In a real app, this would be an API call
      // await deliveryService.deleteDeliveryPerson(id);
      
      const updatedPersonnel = deliveryPersonnel.filter(person => person.id !== id);
      setDeliveryPersonnel(updatedPersonnel);
      
      notify('Delivery person deleted successfully', 'success');
    }
  };

  // Assign order to delivery person (updated to use the API)
  const handleAssignOrder = async () => {
    if (!selectedOrder || !selectedPerson) return;

    try {
      setIsLoading(true);
      await deliveryService.assignDeliveryOrder(selectedOrder.order_id, selectedPerson.id);
      
      // Refresh data after assignment
      await fetchDeliveryOrders();
      await fetchDeliveryPersonnel();
      
      setIsAssignOrderModalOpen(false);
      setSelectedOrder(null);
      setSelectedPerson(null);
      
      notify('Order assigned successfully', 'success');
    } catch (error) {
      console.error('Error assigning order:', error);
      notify(`Failed to assign order: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Update order status (updated to use the API)
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      setIsLoading(true);
      await deliveryService.updateOrderStatus(orderId, newStatus);
      
      // Refresh data after status update
      await fetchDeliveryOrders();
      await fetchDeliveryPersonnel(); // Staff status might change too
      
      notify(`Order status updated to ${newStatus.replace('_', ' ')}`, 'success');
    } catch (error) {
      console.error('Error updating order status:', error);
      notify(`Failed to update order status: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Add new delivery zone
  const handleAddZone = async () => {
    // Validate form
    if (!newZone.name) {
      notify('Zone name is required', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const response = await deliveryService.createDeliveryZone(newZone);
      
      setDeliveryZones([...deliveryZones, response.zone]);
      setIsAddZoneModalOpen(false);
      setNewZone({
        name: '',
        description: '',
        delivery_fee: 0,
        estimated_time: 30,
        status: 'active'
      });
      
      notify('Delivery zone added successfully', 'success');
    } catch (error) {
      console.error('Error adding delivery zone:', error);
      notify(error.message || 'Failed to add delivery zone', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Update delivery zone
  const handleUpdateZone = async () => {
    if (!selectedZone) return;
    
    // Validate form
    if (!selectedZone.name) {
      notify('Zone name is required', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const response = await deliveryService.updateDeliveryZone(selectedZone.id, selectedZone);
      
      const updatedZones = deliveryZones.map(zone =>
        zone.id === selectedZone.id ? response.zone : zone
      );

      setDeliveryZones(updatedZones);
      setIsEditZoneModalOpen(false);
      setSelectedZone(null);
      
      notify('Delivery zone updated successfully', 'success');
    } catch (error) {
      console.error('Error updating delivery zone:', error);
      notify(error.message || 'Failed to update delivery zone', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete delivery zone
  const handleDeleteZone = async (id) => {
    if (window.confirm('Are you sure you want to delete this delivery zone?')) {
      try {
        setIsLoading(true);
        await deliveryService.deleteDeliveryZone(id);
        
        const updatedZones = deliveryZones.filter(zone => zone.id !== id);
        setDeliveryZones(updatedZones);
        
        notify('Delivery zone deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting delivery zone:', error);
        notify(error.message || 'Failed to delete delivery zone', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleString(undefined, options);
  };
  // Get class name for status badges
  const getStatusClass = (status) => {
    switch (status) {
      case 'available': return 'status-available';
      case 'on_delivery': return 'status-on-delivery';
      case 'offline': return 'status-offline';
      case 'pending': return 'status-pending';
      case 'on_the_way': return 'status-on-the-way';
      case 'delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      case 'Pending': return 'status-pending';
      case 'Preparing': return 'status-preparing';
      case 'Ready': return 'status-ready';
      case 'Cancelled': return 'status-cancelled';
      default: return '';
    }
  };
  
  // Function to handle modal scroll behavior and show/hide scroll indicators
  const handleModalScroll = (event) => {
    const { scrollTop } = event.target;
    
    // Show or hide scroll hint based on scroll position
    const scrollHint = document.querySelector('.scroll-hint');
    if (scrollHint) {
      if (scrollTop > 50) {
        scrollHint.style.opacity = '0';
      } else {
        scrollHint.style.opacity = '1';
      }
    }
  };

  // Format status text for display
  const formatStatus = (status) => {
    // Don't transform kitchen_status values since they're already capitalized in the database
    if (['Pending', 'Preparing', 'Ready', 'Cancelled'].includes(status)) {
      return status;
    }
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Get person name by ID
  const getPersonName = (id) => {
    const person = deliveryPersonnel.find(p => p.id === id);
    return person ? person.name : 'Unassigned';
  };

  // Safely format a number with toFixed
  const safelyFormatNumber = (value, decimals = 2) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toFixed(decimals);
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-content">
        <Header title="Delivery Management" />
        
        {/* Backend Status Banner */}
        {!backendStatus.isConnected && (
          <div className="backend-error-banner">
            <i className="fas fa-exclamation-triangle"></i>
            <p>{backendStatus.message}</p>
            <p className="small">Using mock data for demonstration purposes.</p>
          </div>
        )}
        
        <div className="delivery-page-header">
          <div className="delivery-header-content">
            <h2>Manage Delivery Operations</h2>
            <p>Track delivery orders and personnel in real-time</p>
          </div>
          
          <div className="delivery-metrics">
            <div className="metric-card pending-orders">
              <span className="metric-value">{filteredOrders.filter(order => order.delivery_status === 'pending').length}</span>
              <span className="metric-label">Pending</span>
            </div>
            <div className="metric-card on-the-way">
              <span className="metric-value">{filteredOrders.filter(order => order.delivery_status === 'on_the_way').length}</span>
              <span className="metric-label">On the way</span>
            </div>
            <div className="metric-card delivered">
              <span className="metric-value">{filteredOrders.filter(order => order.delivery_status === 'delivered').length}</span>
              <span className="metric-label">Delivered</span>
            </div>
            <div className="metric-card active-personnel">
              <span className="metric-value">{filteredPersonnel.filter(person => person.status === 'available').length}</span>
              <span className="metric-label">Available Personnel</span>
            </div>
          </div>
        </div>
        
        <div className="delivery-tabs">
          <button 
            className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <i className="fas fa-shipping-fast"></i> Delivery Orders
          </button>
          <button 
            className={`tab-button ${activeTab === 'personnel' ? 'active' : ''}`}
            onClick={() => setActiveTab('personnel')}
          >
            <i className="fas fa-users"></i> Delivery Personnel
          </button>
          <button 
            className={`tab-button ${activeTab === 'zones' ? 'active' : ''}`}
            onClick={() => setActiveTab('zones')}
          >
            <i className="fas fa-map-marked-alt"></i> Delivery Zones
          </button>
        </div>
        
        {/* Delivery Orders Tab */}
        {activeTab === 'orders' && (
          <div className="delivery-orders-section">
            <div className="section-header">
              <div className="filter-controls-container">
                <div className="filter-controls">
                  <div className="search-wrapper">
                    <i className="fas fa-search search-icon"></i>
                    <input 
                      type="text"
                      placeholder="Search by customer or zone..."
                      value={filters.orders.search}
                      onChange={(e) => handleFilterChange('orders', 'search', e.target.value)}
                      className="search-input"
                    />
                  </div>
                  
                  <select
                    value={filters.orders.status}
                    onChange={(e) => handleFilterChange('orders', 'status', e.target.value)}
                    className="status-select"
                  >
                    <option value="">All Delivery Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="on_the_way">On The Way</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  
                  <select
                    value={filters.orders.kitchenStatus}
                    onChange={(e) => handleFilterChange('orders', 'kitchenStatus', e.target.value)}
                    className="status-select"
                  >
                    <option value="">All Kitchen Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Preparing">Preparing</option>
                    <option value="Ready">Ready</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  
                  <input 
                    type="date"
                    value={filters.orders.date}
                    onChange={(e) => handleFilterChange('orders', 'date', e.target.value)}
                    className="date-input"
                  />
                  
                  <button 
                    className="reset-filter-btn"
                    onClick={() => resetFilters('orders')}
                  >
                    <i className="fas fa-undo-alt"></i> Reset
                  </button>
                </div>
              </div>
            </div>
            
            {isLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading delivery orders...</p>
              </div>
            ) : (
              <div className="orders-table-container">
                {filteredOrders.length > 0 ? (
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Delivery Zone</th>
                        <th>Contact</th>
                        <th>Order Time</th>
                        <th>Total</th>
                        <th>Kitchen Status</th>
                        <th>Status</th>
                        <th>Assigned To</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(order => (
                        <tr key={order.order_id}>
                          <td>{order.order_id}</td>
                          <td>{order.customer_name}</td>
                          <td className="address-cell">{order.zone_name || 'Not specified'}</td>
                          <td>{order.contact_number}</td>
                          <td>{formatDate(order.order_time)}</td>
                          <td>Rs. {order.order_total.toFixed(2)}</td>
                          <td><span className={`status-badge ${getStatusClass(order.kitchen_status)}`}>{order.kitchen_status}</span></td>
                          <td><span className={`status-badge ${getStatusClass(order.delivery_status)}`}>{formatStatus(order.delivery_status)}</span></td>
                          <td>{order.assigned_to ? getPersonName(order.assigned_to) : <span className="unassigned-label">Unassigned</span>}</td>
                          <td>
                            <div className="order-actions">
                              <button 
                                className="view-btn"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setIsOrderDetailsModalOpen(true);
                                }}
                              >
                                <i className="fas fa-eye"></i> View
                              </button>
                              
                              {order.delivery_status === 'pending' && order.kitchen_status === 'Ready' && (
                                <button 
                                  className="assign-btn"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setIsAssignOrderModalOpen(true);
                                  }}
                                >
                                  <i className="fas fa-user-plus"></i> Assign
                                </button>
                              )}
                              
                              {order.delivery_status === 'pending' && order.kitchen_status !== 'Ready' && (
                                <span className="waiting-label">Waiting for kitchen</span>
                              )}
                              
                              {order.delivery_status === 'on_the_way' && (
                                <button 
                                  className="complete-btn"
                                  onClick={() => handleUpdateOrderStatus(order.order_id, 'delivered')}
                                >
                                  <i className="fas fa-check"></i> Delivered
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-data-message">
                    <i className="fas fa-shipping-fast no-data-icon"></i>
                    <p>No delivery orders found matching the current filters.</p>
                    <button onClick={() => resetFilters('orders')}>
                      <i className="fas fa-undo-alt"></i> Reset Filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Delivery Personnel Tab */}
        {activeTab === 'personnel' && (
          <div className="delivery-personnel-section">
            <div className="section-header">
              <div className="filter-controls-container">
                <div className="filter-controls">
                  <div className="search-wrapper">
                    <i className="fas fa-search search-icon"></i>
                    <input 
                      type="text"
                      placeholder="Search by name or contact..."
                      value={filters.personnel.search}
                      onChange={(e) => handleFilterChange('personnel', 'search', e.target.value)}
                      className="search-input"
                    />
                  </div>
                  
                  <select
                    value={filters.personnel.status}
                    onChange={(e) => handleFilterChange('personnel', 'status', e.target.value)}
                    className="status-select"
                  >
                    <option value="">All Statuses</option>
                    <option value="available">Available</option>
                    <option value="on_delivery">On Delivery</option>
                    <option value="offline">Offline</option>
                  </select>
                  
                  <button 
                    className="reset-filter-btn"
                    onClick={() => resetFilters('personnel')}
                  >
                    <i className="fas fa-undo-alt"></i> Reset
                  </button>
                </div>
              </div>
              
              <div className="add-personnel-info">
                <p>Delivery staff are managed in the Staff Management page</p>
              </div>
            </div>
            
            {isLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading delivery personnel...</p>
              </div>
            ) : (
              <>
                {filteredPersonnel.length > 0 ? (
                  <div className="personnel-cards">
                    {filteredPersonnel.map(person => (
                      <div className={`personnel-card ${person.status}`} key={person.id}>
                        <div className="personnel-avatar">
                          <span>{person.name.charAt(0)}</span>
                        </div>
                        <div className="personnel-header">
                          <h3>{person.name}</h3>
                          <span className={`status-badge ${getStatusClass(person.status)}`}>
                            {formatStatus(person.status)}
                          </span>
                        </div>
                        
                        <div className="personnel-info">
                          <div className="info-item">
                            <i className="fas fa-id-badge"></i>
                            <span><strong>ID:</strong> {person.id}</span>
                          </div>
                          <div className="info-item">
                            <i className="fas fa-phone"></i>
                            <span><strong>Phone:</strong> {person.contact_number}</span>
                          </div>
                          <div className="info-item">
                            <i className="fas fa-envelope"></i>
                            <span><strong>Email:</strong> {person.email}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-data-message">
                    <i className="fas fa-user-slash no-data-icon"></i>
                    <p>No delivery personnel found matching the current filters.</p>
                    <button onClick={() => resetFilters('personnel')}>
                      <i className="fas fa-undo-alt"></i> Reset Filters
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        {/* Delivery Zones Tab */}
        {activeTab === 'zones' && (
          <div className="delivery-zones-section">
            <div className="section-header">
              <div className="filter-controls-container">
                <div className="filter-controls">
                  <div className="search-wrapper">
                    <i className="fas fa-search search-icon"></i>
                    <input 
                      type="text"
                      placeholder="Search zones..."
                      value={filters.zones.search}
                      onChange={(e) => handleFilterChange('zones', 'search', e.target.value)}
                      className="search-input"
                    />
                  </div>
                  
                  <select
                    value={filters.zones.status}
                    onChange={(e) => handleFilterChange('zones', 'status', e.target.value)}
                    className="status-select"
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  
                  <button 
                    className="reset-filter-btn"
                    onClick={() => resetFilters('zones')}
                  >
                    <i className="fas fa-undo-alt"></i> Reset
                  </button>
                </div>
              </div>
              
              <button 
                className="add-button"
                onClick={() => setIsAddZoneModalOpen(true)}
              >
                <i className="fas fa-plus"></i> Add New Zone
              </button>
            </div>
            
            {isLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading delivery zones...</p>
              </div>
            ) : (
              <div className="zones-table-container">
                {filteredZones.length > 0 ? (
                  <table className="zones-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Zone Name</th>
                        <th>Description</th>
                        <th>Delivery Fee</th>
                        <th>Est. Time (min)</th>
                        <th>Active Orders</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredZones.map(zone => (
                        <tr key={zone.id} className={zone.status === 'inactive' ? 'inactive-row' : ''}>
                          <td>{zone.id}</td>
                          <td>{zone.name}</td>
                          <td>{zone.description}</td>
                          <td>Rs. {safelyFormatNumber(zone.delivery_fee)}</td>
                          <td>{zone.estimated_time || 0}</td>
                          <td>{zone.active_orders || 0}</td>
                          <td>
                            <span className={`status-badge ${zone.status === 'active' ? 'status-available' : 'status-offline'}`}>
                              {zone.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div className="zone-actions">
                              <button 
                                className="edit-btn"
                                onClick={() => {
                                  setSelectedZone(zone);
                                  setIsEditZoneModalOpen(true);
                                }}
                              >
                                <i className="fas fa-edit"></i> Edit
                              </button>
                              <button 
                                className="delete-btn"
                                onClick={() => handleDeleteZone(zone.id)}
                              >
                                <i className="fas fa-trash"></i> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-data-message">
                    <i className="fas fa-map-marker-alt no-data-icon"></i>
                    <p>No delivery zones found matching the current filters.</p>
                    <button onClick={() => resetFilters('zones')}>
                      <i className="fas fa-undo-alt"></i> Reset Filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Add Person Modal */}
        {isAddPersonModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2><i className="fas fa-user-plus"></i> Add New Delivery Person</h2>
                <button 
                  className="close-modal-btn"
                  onClick={() => setIsAddPersonModalOpen(false)}
                >
                  &times;
                </button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label><i className="fas fa-user"></i> Full Name</label>
                  <input 
                    type="text"
                    value={newPerson.name}
                    onChange={(e) => setNewPerson({...newPerson, name: e.target.value})}
                    placeholder="Enter full name"
                  />
                </div>
                
                <div className="form-group">
                  <label><i className="fas fa-phone"></i> Contact Number</label>
                  <input 
                    type="text"
                    value={newPerson.contact_number}
                    onChange={(e) => setNewPerson({...newPerson, contact_number: e.target.value})}
                    placeholder="Enter contact number"
                  />
                </div>
                
                <div className="form-group">
                  <label><i className="fas fa-envelope"></i> Email</label>
                  <input 
                    type="email"
                    value={newPerson.email}
                    onChange={(e) => setNewPerson({...newPerson, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label><i className="fas fa-motorcycle"></i> Vehicle Type</label>
                    <select
                      value={newPerson.vehicle_type}
                      onChange={(e) => setNewPerson({...newPerson, vehicle_type: e.target.value})}
                    >
                      <option value="motorcycle">Motorcycle</option>
                      <option value="car">Car</option>
                      <option value="bicycle">Bicycle</option>
                      <option value="scooter">Scooter</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label><i className="fas fa-id-card"></i> License Number</label>
                    <input 
                      type="text"
                      value={newPerson.license_number}
                      onChange={(e) => setNewPerson({...newPerson, license_number: e.target.value})}
                      placeholder="Enter license number"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label><i className="fas fa-toggle-on"></i> Status</label>
                  <select
                    value={newPerson.status}
                    onChange={(e) => setNewPerson({...newPerson, status: e.target.value})}
                  >
                    <option value="available">Available</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
                
                <div className="modal-actions">
                  <button 
                    className="cancel-btn"
                    onClick={() => setIsAddPersonModalOpen(false)}
                  >
                    <i className="fas fa-times"></i> Cancel
                  </button>
                  <button 
                    className="save-btn"
                    onClick={handleAddPerson}
                  >
                    <i className="fas fa-save"></i> Add Person
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit Person Modal */}
        {isEditPersonModalOpen && selectedPerson && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Edit Delivery Person</h2>
                <button 
                  className="close-modal-btn"
                  onClick={() => setIsEditPersonModalOpen(false)}
                >
                  &times;
                </button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text"
                    value={selectedPerson.name}
                    onChange={(e) => setSelectedPerson({...selectedPerson, name: e.target.value})}
                    placeholder="Enter full name"
                  />
                </div>
                
                <div className="form-group">
                  <label>Contact Number</label>
                  <input 
                    type="text"
                    value={selectedPerson.contact_number}
                    onChange={(e) => setSelectedPerson({...selectedPerson, contact_number: e.target.value})}
                    placeholder="Enter contact number"
                  />
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email"
                    value={selectedPerson.email}
                    onChange={(e) => setSelectedPerson({...selectedPerson, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
                
                <div className="form-group">
                  <label>Vehicle Type</label>
                  <select
                    value={selectedPerson.vehicle_type}
                    onChange={(e) => setSelectedPerson({...selectedPerson, vehicle_type: e.target.value})}
                  >
                    <option value="motorcycle">Motorcycle</option>
                    <option value="car">Car</option>
                    <option value="bicycle">Bicycle</option>
                    <option value="scooter">Scooter</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>License Number</label>
                  <input 
                    type="text"
                    value={selectedPerson.license_number}
                    onChange={(e) => setSelectedPerson({...selectedPerson, license_number: e.target.value})}
                    placeholder="Enter license number"
                  />
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={selectedPerson.status}
                    onChange={(e) => setSelectedPerson({...selectedPerson, status: e.target.value})}
                    disabled={selectedPerson.status === 'on_delivery'}
                  >
                    <option value="available">Available</option>
                    <option value="on_delivery">On Delivery</option>
                    <option value="offline">Offline</option>
                  </select>
                  {selectedPerson.status === 'on_delivery' && (
                    <p className="helper-text">Cannot change status while on delivery</p>
                  )}
                </div>
                
                <div className="modal-actions">
                  <button 
                    className="cancel-btn"
                    onClick={() => setIsEditPersonModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="save-btn"
                    onClick={handleUpdatePerson}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Assign Order Modal */}
        {isAssignOrderModalOpen && selectedOrder && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Assign Order #{selectedOrder.order_id}</h2>
                <button 
                  className="close-modal-btn"
                  onClick={() => setIsAssignOrderModalOpen(false)}
                >
                  &times;
                </button>
              </div>
              
              <div className="modal-body">
                <div className="order-summary">
                  <p><strong>Customer:</strong> {selectedOrder.customer_name}</p>
                  <p><strong>Delivery Zone:</strong> {selectedOrder.zone_name || 'Not specified'}</p> {/* Add zone display */}
                  <p><strong>Address:</strong> {selectedOrder.delivery_address}</p>
                  <p><strong>Order Total:</strong> Rs. {selectedOrder.order_total.toFixed(2)}</p>
                </div>
                
                <h3>Available Delivery Personnel</h3>
                
                {deliveryPersonnel.filter(person => person.status === 'available').length > 0 ? (
                  <div className="personnel-select-list">
                    {deliveryPersonnel
                      .filter(person => person.status === 'available')
                      .map(person => (
                        <div 
                          key={person.id}
                          className={`personnel-select-item ${selectedPerson && selectedPerson.id === person.id ? 'selected' : ''}`}
                          onClick={() => setSelectedPerson(person)}
                        >
                          <div className="personnel-select-info">
                            <h4>{person.name}</h4>
                            <p>{person.contact_number}</p>
                            <p>Vehicle: {formatStatus(person.vehicle_type)}</p>
                          </div>
                          <div className="personnel-select-stats">
                            <span>{person.completed_deliveries} deliveries</span>
                            <span>Rating: {person.avg_rating ? person.avg_rating.toFixed(1) : 'N/A'}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="no-data-message">
                    <p>No delivery personnel are currently available.</p>
                  </div>
                )}
                
                <div className="modal-actions">
                  <button 
                    className="cancel-btn"
                    onClick={() => setIsAssignOrderModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="save-btn"
                    onClick={handleAssignOrder}
                    disabled={!selectedPerson}
                  >
                    Assign Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Order Details Modal */}
        {isOrderDetailsModalOpen && selectedOrder && (
          <div className="modal-overlay">
            <div className="modal-content">              <div className="modal-header">
                <h2>Order #{selectedOrder.order_id} Details</h2>
                <div className="modal-header-actions">
                  <small className="scroll-hint">Scroll for more details ↓</small>
                  <button 
                    className="close-modal-btn"
                    onClick={() => setIsOrderDetailsModalOpen(false)}
                  >
                    &times;
                  </button>
                </div>
              </div>
                <div className="modal-body" onScroll={handleModalScroll}>
                <div className="order-details-section">
                  <h3>Customer Information</h3>
                  <p><strong>Name:</strong> {selectedOrder.customer_name}</p>
                  <p><strong>Contact:</strong> {selectedOrder.contact_number}</p>
                  <p><strong>Delivery Zone:</strong> {selectedOrder.zone_name || 'Not specified'}</p> {/* Add zone here too */}
                  <p><strong>Delivery Address:</strong> {selectedOrder.delivery_address}</p>
                </div>
                
                {/* Add Special Instructions section */}
                {selectedOrder.special_instructions && (
                  <div className="order-details-section special-instructions">
                    <h3>Delivery Instructions</h3>
                    <div className="instructions-content">
                      <p>{selectedOrder.special_instructions}</p>
                    </div>
                  </div>
                )}
                
                <div className="order-details-section">
                  <h3>Order Information</h3>
                  <p><strong>Order Time:</strong> {formatDate(selectedOrder.order_time)}</p>
                  <p><strong>Kitchen Status:</strong> <span className={`status-badge ${getStatusClass(selectedOrder.kitchen_status)}`}>{selectedOrder.kitchen_status}</span></p>
                  <p><strong>Delivery Status:</strong> <span className={`status-badge ${getStatusClass(selectedOrder.delivery_status)}`}>{formatStatus(selectedOrder.delivery_status)}</span></p>
                  {selectedOrder.assigned_to && (
                    <p><strong>Assigned To:</strong> {getPersonName(selectedOrder.assigned_to)}</p>
                  )}
                  {selectedOrder.estimated_delivery && (
                    <p><strong>Estimated Delivery:</strong> {formatDate(selectedOrder.estimated_delivery)}</p>
                  )}
                  {selectedOrder.delivery_time && (
                    <p><strong>Delivered At:</strong> {formatDate(selectedOrder.delivery_time)}</p>
                  )}
                  {selectedOrder.rating && (
                    <p><strong>Customer Rating:</strong> {selectedOrder.rating}/5</p>
                  )}
                </div>
                
                <div className="order-details-section">
                  <h3>Order Items</h3>
                  <table className="order-items-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>Rs. {item.price.toFixed(2)}</td>
                          <td>Rs. {(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3"><strong>Total</strong></td>
                        <td><strong>Rs. {selectedOrder.order_total.toFixed(2)}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                <div className="order-details-actions">
                  {selectedOrder.delivery_status === 'pending' && selectedOrder.kitchen_status === 'Ready' && (
                    <button 
                      className="assign-btn"
                      onClick={() => {
                        setIsOrderDetailsModalOpen(false);
                        setIsAssignOrderModalOpen(true);
                      }}
                    >
                      Assign to Delivery Person
                    </button>
                  )}
                  
                  {selectedOrder.delivery_status === 'pending' && selectedOrder.kitchen_status !== 'Ready' && (
                    <div className="waiting-message">
                      <i className="fas fa-clock"></i> Waiting for kitchen to complete the order
                    </div>
                  )}
                  
                  {selectedOrder.delivery_status === 'on_the_way' && (
                    <button 
                      className="complete-btn"
                      onClick={() => {   handleUpdateOrderStatus(selectedOrder.order_id, 'delivered');
                        setIsOrderDetailsModalOpen(false);
                      }}
                    >
                      Mark as Delivered
                    </button>
                  )}
                  
                  {['pending', 'on_the_way'].includes(selectedOrder.delivery_status) && (
                    <button 
                      className="cancel-btn"
                      onClick={() => {
                        handleUpdateOrderStatus(selectedOrder.order_id, 'cancelled');
                        setIsOrderDetailsModalOpen(false);
                      }}
                    >
                      Cancel Order
                    </button>
                  )}
                  
                  <button 
                    className="close-btn"
                    onClick={() => setIsOrderDetailsModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Add Zone Modal */}
        {isAddZoneModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2><i className="fas fa-map-marked-alt"></i> Add New Delivery Zone</h2>
                <button 
                  className="close-modal-btn"
                  onClick={() => setIsAddZoneModalOpen(false)}
                >
                  &times;
                </button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label><i className="fas fa-map-pin"></i> Zone Name</label>
                  <input 
                    type="text"
                    value={newZone.name}
                    onChange={(e) => setNewZone({...newZone, name: e.target.value})}
                    placeholder="Enter zone name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label><i className="fas fa-info-circle"></i> Description</label>
                  <textarea 
                    value={newZone.description}
                    onChange={(e) => setNewZone({...newZone, description: e.target.value})}
                    placeholder="Enter zone description"
                    rows="3"
                  ></textarea>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label><i className="fas fa-money-bill-wave"></i> Delivery Fee (Rs)</label>
                    <input 
                      type="number"
                      value={newZone.delivery_fee}
                      onChange={(e) => setNewZone({...newZone, delivery_fee: parseFloat(e.target.value) || 0})}
                      min="0"
                      step="10"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label><i className="fas fa-clock"></i> Estimated Time (minutes)</label>
                    <input 
                      type="number"
                      value={newZone.estimated_time}
                      onChange={(e) => setNewZone({...newZone, estimated_time: parseInt(e.target.value) || 0})}
                      min="0"
                      step="5"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label><i className="fas fa-toggle-on"></i> Status</label>
                  <select
                    value={newZone.status}
                    onChange={(e) => setNewZone({...newZone, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div className="modal-actions">
                  <button 
                    className="cancel-btn"
                    onClick={() => setIsAddZoneModalOpen(false)}
                  >
                    <i className="fas fa-times"></i> Cancel
                  </button>
                  <button 
                    className="save-btn"
                    onClick={handleAddZone}
                  >
                    <i className="fas fa-save"></i> Add Zone
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit Zone Modal */}
        {isEditZoneModalOpen && selectedZone && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Edit Delivery Zone</h2>
                <button 
                  className="close-modal-btn"
                  onClick={() => setIsEditZoneModalOpen(false)}
                >
                  &times;
                </button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label>Zone Name</label>
                  <input 
                    type="text"
                    value={selectedZone.name}
                    onChange={(e) => setSelectedZone({...selectedZone, name: e.target.value})}
                    placeholder="Enter zone name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Description</label>
                  <textarea 
                    value={selectedZone.description}
                    onChange={(e) => setSelectedZone({...selectedZone, description: e.target.value})}
                    placeholder="Enter zone description"
                    rows="3"
                  ></textarea>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Delivery Fee (Rs)</label>
                    <input 
                      type="number"
                      value={selectedZone.delivery_fee}
                      onChange={(e) => setSelectedZone({...selectedZone, delivery_fee: parseFloat(e.target.value) || 0})}
                      min="0"
                      step="10"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Estimated Time (minutes)</label>
                    <input 
                      type="number"
                      value={selectedZone.estimated_time}
                      onChange={(e) => setSelectedZone({...selectedZone, estimated_time: parseInt(e.target.value) || 0})}
                      min="0"
                      step="5"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={selectedZone.status}
                    onChange={(e) => setSelectedZone({...selectedZone, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div className="modal-actions">
                  <button 
                    className="cancel-btn"
                    onClick={() => setIsEditZoneModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="save-btn"
                    onClick={handleUpdateZone}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </main>
    </div>
  );
}

export default DeliveryManagement;
