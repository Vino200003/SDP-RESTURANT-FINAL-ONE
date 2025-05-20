import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { 
  getAllReservations, 
  updateReservationStatus, 
  getReservationStats,
  checkServerConnection,
  getReservationStatus,
  getAllTables,
  updateTableStatus,
  setTableActiveStatus,
  createNewTable,
  checkTablesAvailability,
  autoCancelPendingReservations  // Import the new function
} from '../services/reservationService';
import { serverStatus } from '../utils/mockData';
import '../styles/ReservationManagement.css';
import useAuthToken from '../hooks/useAuthToken';

function ReservationManagement() {
  // Initialize the authentication token for API calls
  useAuthToken();
  
  // State for reservations
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isServerDown, setIsServerDown] = useState(false);
  const [reservationStats, setReservationStats] = useState({
    total: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    searchTerm: '',
    searchOption: 'all', // Add search option for dropdown
    page: 1,
    limit: 10,
    startDate: '',
    endDate: ''
  });

  // Simple notification function
  const notify = (message, type = 'info') => {
    console.log(`[${type}] ${message}`);
    alert(message);
  };

  // Fetch reservations and stats on component mount
  useEffect(() => {
    fetchReservations();
    fetchReservationStats();
  }, []);

  // Fetch reservations when filters change
  useEffect(() => {
    fetchReservations();
  }, [filters.page, filters.limit, filters.status, filters.startDate, filters.endDate]);

  // Update server status state when the status changes
  useEffect(() => {
    setIsServerDown(!serverStatus.isAvailable);
  }, [serverStatus.isAvailable]);

  const fetchReservations = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching reservations with filters:', {
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate
      });
      const data = await getAllReservations({
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate
      });
      // Update server status based on if we got mock data or real data
      setIsServerDown(!serverStatus.isAvailable);
      if (data.reservations) {
        // Sort reservations by ID in descending order (newest first)
        const sortedReservations = [...data.reservations].sort((a, b) => {
          const idA = a.reserve_id || a.reservation_id || 0;
          const idB = b.reserve_id || b.reservation_id || 0;
          return idB - idA;
        });
        
        // Cache the fetched reservations for in-memory processing
        localStorage.setItem('cachedReservations', JSON.stringify(sortedReservations));
        
        setReservations(sortedReservations);
        setFilteredReservations(sortedReservations);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        // If the API returns an array instead of an object with pagination
        const dataArray = Array.isArray(data) ? data : [];
        // Sort by ID in descending order
        const sortedData = [...dataArray].sort((a, b) => {
          const idA = a.reserve_id || a.reservation_id || 0;
          const idB = b.reserve_id || b.reservation_id || 0;
          return idB - idA;
        });
        
        // Cache the fetched reservations for in-memory processing
        localStorage.setItem('cachedReservations', JSON.stringify(sortedData));
        
        setReservations(sortedData);
        setFilteredReservations(sortedData);
      }
    } catch (error) {
      notify(`Error fetching reservations: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReservationStats = async () => {
    try {
      const data = await getReservationStats(filters.startDate, filters.endDate);
      // Update server status based on result
      setIsServerDown(!serverStatus.isAvailable);
      setReservationStats({
        total: data.total_reservations || 0,
        upcoming: data.upcoming_reservations || 0,
        completed: data.completed_reservations || 0,
        cancelled: data.cancelled_reservations || 0,
      });
    } catch (error) {
      console.error('Error fetching reservation stats:', error);
      setReservationStats({
        total: 0,
        upcoming: 0,
        completed: 0,
        cancelled: 0,
      });
    }
  };

  // Handle retry connection button from the notifier
  const handleRetryConnection = async () => {
    console.log('Retrying server connection...');
    const isAvailable = await checkServerConnection();
    setIsServerDown(!isAvailable);
    if (isAvailable) {
      // Refresh data with real data from server
      await fetchReservations();
      await fetchReservationStats();
      notify('Server connection restored! Using real data now.', 'success');
    } else {
      notify('Server is still unavailable. Continuing with mock data.', 'warning');
    }
  };

  // Apply search filter locally
  useEffect(() => {
    if (filters.searchTerm) {
      applySearchFilter();
    } else {
      setFilteredReservations(reservations);
    }
  }, [filters.searchTerm, reservations]);

  const applySearchFilter = (reservationsToFilter = reservations) => {
    const searchLower = filters.searchTerm.toLowerCase();
    const searchOption = filters.searchOption || 'all';
    
    const result = reservationsToFilter.filter(reservation => {
      // If empty search term, return all results
      if (!searchLower.trim()) return true;
      
      // Search based on the selected option
      switch (searchOption) {
        case 'id':
          return (reservation.reserve_id?.toString().toLowerCase().includes(searchLower) || 
                 reservation.reservation_id?.toString().toLowerCase().includes(searchLower));
        
        case 'customer':
          return (reservation.customer_name?.toLowerCase().includes(searchLower) ||
                 reservation.first_name?.toLowerCase().includes(searchLower) ||
                 reservation.last_name?.toLowerCase().includes(searchLower));
        
        case 'email':
          return reservation.email?.toLowerCase().includes(searchLower);
        
        case 'phone':
          return reservation.phone_number?.toLowerCase().includes(searchLower);
        
        case 'table':
          return reservation.table_no?.toString().toLowerCase().includes(searchLower);
        
        case 'all':
        default:
          // Search all fields (original implementation)
          if ((reservation.reserve_id || reservation.reservation_id) && 
              (reservation.reserve_id?.toString().toLowerCase().includes(searchLower) || 
               reservation.reservation_id?.toString().toLowerCase().includes(searchLower))) {
            return true;
          }
          
          if (reservation.user_id && 
              reservation.user_id.toString().toLowerCase().includes(searchLower)) {
            return true;
          }
          
          if (reservation.customer_name && 
              reservation.customer_name.toLowerCase().includes(searchLower)) {
            return true;
          }
          
          if ((reservation.first_name && reservation.first_name.toLowerCase().includes(searchLower)) ||
              (reservation.last_name && reservation.last_name.toLowerCase().includes(searchLower))) {
            return true;
          }
          
          if (reservation.email && 
              reservation.email.toLowerCase().includes(searchLower)) {
            return true;
          }
          
          if (reservation.phone_number && 
              reservation.phone_number.toLowerCase().includes(searchLower)) {
            return true;
          }
          
          if (reservation.table_no && 
              reservation.table_no.toString().toLowerCase().includes(searchLower)) {
            return true;
          }
          
          return false;
      }
    });
    
    setFilteredReservations(result);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
      // Reset to page 1 when changing filters (except when changing the page itself)
      page: name === 'page' ? value : 1
    });
  };

  const handleDateFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
      page: 1
    });
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      searchTerm: '',
      searchOption: 'all', // Reset to 'all'
      page: 1,
      limit: 10,
      startDate: '',
      endDate: ''
    });
  };

  const handleViewDetails = (reservation) => {
    setSelectedReservation(reservation);
    setIsDetailsModalOpen(true);
  };

  // Modify the handleUpdateStatus function to force immediate re-render
  const handleUpdateStatus = async (reservationId, newStatus) => {
    try {
      setIsLoading(true);
      console.log(`Attempting to update reservation ${reservationId} to status ${newStatus}`);
      // Force an immediate update in the UI by updating in-memory first
      const statusesJson = localStorage.getItem('reservationStatuses') || '{}';
      const statuses = JSON.parse(statusesJson);
      statuses[reservationId] = newStatus;
      localStorage.setItem('reservationStatuses', JSON.stringify(statuses));

      // Force re-render by creating new objects
      setReservations(prev => {
        return prev.map(r => 
          (r.reserve_id === reservationId || r.reservation_id === reservationId) 
            ? {...r} // Create a new object reference to force re-render
            : r
        );
      });
      
      setFilteredReservations(prev => {
        return prev.map(r => 
          (r.reserve_id === reservationId || r.reservation_id === reservationId) 
            ? {...r} // Create a new object reference to force re-render
            : r
        );
      });
      
      // If we're viewing this reservation, update the modal too
      if (selectedReservation && 
          (selectedReservation.reserve_id === reservationId || 
           selectedReservation.reservation_id === reservationId)) {
        setSelectedReservation({...selectedReservation});
      }
      
      // Now call the API to update the server
      const result = await updateReservationStatus(reservationId, newStatus);
      console.log('Update status result:', result);
      
      // Refresh reservation stats
      fetchReservationStats();
      
      notify(`Reservation #${reservationId} status updated to ${newStatus}`, 'success');
    } catch (error) {
      console.error('Error updating reservation status:', error);
      notify(`Error updating reservation status: ${error.message}`, 'error');
      // If the update failed, refresh the data to ensure we're in sync
      fetchReservations();
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Confirmed': return 'status-confirmed';
      case 'Completed': return 'status-completed';
      case 'Cancelled': return 'status-cancelled';
      case 'Pending': return 'status-pending';
      default: return '';
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setFilters({
      ...filters,
      page: newPage
    });
  };

  // Add an event listener for status changes
  useEffect(() => {
    // This function will be called when any reservation status is changed
    const handleStatusChange = (event) => {
      const { reservationId, status } = event.detail;
      console.log(`Status change event: Reservation ${reservationId} -> ${status}`);
      // Update local state immediately to reflect the change
      setReservations(prevReservations => {
        const updated = prevReservations.map(reservation => {
          if ((reservation.reserve_id === reservationId || reservation.reservation_id === reservationId)) {
            // Create a new object for this reservation
            return {...reservation};
          }
          return reservation;
        });
        return updated;
      });
      
      // Also update the filtered reservations
      setFilteredReservations(prevFiltered => {
        return prevFiltered.map(reservation => {
          if ((reservation.reserve_id === reservationId || reservation.reservation_id === reservationId)) {
            // Create a new object for this reservation
            return {...reservation};
          }
          return reservation;
        });
      });
      
      // Also update the selected reservation if it's being viewed
      if (selectedReservation && 
          (selectedReservation.reserve_id === reservationId || 
           selectedReservation.reservation_id === reservationId)) {
        setSelectedReservation({...selectedReservation});
      }
    };
    
    // Register the event listener
    window.addEventListener('reservationStatusChanged', handleStatusChange);
    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener('reservationStatusChanged', handleStatusChange);
    };
  }, [selectedReservation]); // Only depend on selectedReservation to avoid infinite loops

  // Create a component to force re-render on status change
  function ReservationRow({ reservation, onViewDetails, onStatusChange }) {
    // Use a state variable to force re-renders when status changes
    const [currentStatus, setCurrentStatus] = useState(getReservationStatus(reservation));
    
    // Listen for status changes for this reservation
    useEffect(() => {
      const handleStatusChange = (event) => {
        const { reservationId, status } = event.detail;
        if (reservation.reserve_id === reservationId || reservation.reservation_id === reservationId) {
          setCurrentStatus(status);
        }
      };
      
      window.addEventListener('reservationStatusChanged', handleStatusChange);
      return () => {
        window.removeEventListener('reservationStatusChanged', handleStatusChange);
      };
    }, [reservation]);
    
    // Also update when reservation changes
    useEffect(() => {
      setCurrentStatus(getReservationStatus(reservation));
    }, [reservation]);
      return (
      <tr key={reservation.reserve_id || reservation.reservation_id}>
        <td>{reservation.reserve_id || reservation.reservation_id}</td>
        <td>
          {reservation.customer_name || 
            (reservation.first_name || reservation.last_name ? 
              `${reservation.first_name || ''} ${reservation.last_name || ''}`.trim() : 
              `User ${reservation.user_id}` || 'Guest')}
        </td>
        <td>Table {reservation.table_no}</td>
        <td>{formatDate(reservation.date_time)}</td>
        <td>{reservation.duration || 60} min</td>
        <td>{reservation.guests || reservation.capacity || 'N/A'}</td>
        <td>
          <span className={`status-badge ${getStatusClass(currentStatus)}`}>
            {currentStatus}
          </span>
        </td>
        <td>
          <div className="reservation-actions">
            <button 
              className="view-btn"
              onClick={() => onViewDetails(reservation)}
            >
              View Details
            </button>
            <select 
              className="status-update-select"
              value={currentStatus}
              onChange={(e) => onStatusChange(
                reservation.reserve_id || reservation.reservation_id, 
                e.target.value
              )}
            >
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </td>
      </tr>
    );
  }

  // Add state for tables
  const [tables, setTables] = useState([]);
  const [showTableManager, setShowTableManager] = useState(false);
  const [showAddTableForm, setShowAddTableForm] = useState(false);
  const [newTableData, setNewTableData] = useState({
    capacity: 2,
    is_active: true
  });
  
  // Add state for availability checking in the manage tables section
  const [availabilityCheck, setAvailabilityCheck] = useState({
    checkDate: new Date().toISOString().split('T')[0], // Today's date
    checkTime: '19:00', // Default time (7:00 PM)
    isChecking: false
  });

  // Add state to store availability results for all tables
  const [tablesAvailability, setTablesAvailability] = useState({});
  
  // Fetch tables on component mount
  useEffect(() => {
    fetchTables();
  }, []);
  
  // Fetch tables function
  const fetchTables = async () => {
    try {
      const tablesData = await getAllTables();
      setTables(tablesData);
    } catch (error) {
      console.error('Error fetching tables:', error);
      notify(`Error fetching tables: ${error.message}`, 'error');
    }
  };
  
  // Handle input change for availability check
  const handleAvailabilityCheckChange = (e) => {
    const { name, value } = e.target;
    setAvailabilityCheck(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Check all tables availability based on selected date and time
  const checkAllTablesAvailability = async () => {
    try {
      setAvailabilityCheck(prev => ({ ...prev, isChecking: true }));
      
      // Combine date and time
      const { checkDate, checkTime } = availabilityCheck;
      const dateTimeString = `${checkDate}T${checkTime}:00`;
      
      // Check if valid date
      const checkDateTime = new Date(dateTimeString);
      if (isNaN(checkDateTime.getTime())) {
        notify('Invalid date or time selected.', 'error');
        return;
      }
      
      // Use our service function to get availability
      const availabilityMap = await checkTablesAvailability(dateTimeString);
      setTablesAvailability(availabilityMap);
      
      notify('Tables availability updated for the selected time', 'success');
    } catch (error) {
      console.error('Error checking availability:', error);
      notify('Error checking availability. Please try again.', 'error');
    } finally {
      setAvailabilityCheck(prev => ({ ...prev, isChecking: false }));
    }
  };
  
  // Handle input change for new table form
  const handleNewTableInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const updatedValue = type === 'checkbox' ? checked : value;
    
    setNewTableData(prev => ({
      ...prev,
      [name]: updatedValue
    }));
  };
  
  // Handle submit new table
  const handleSubmitNewTable = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      
      // Validate data
      if (newTableData.capacity < 1) {
        notify('Table capacity must be greater than 0', 'error');
        return;
      }
      
      // Format data properly
      const tableData = {
        capacity: parseInt(newTableData.capacity),
        status: 'Available',
        is_active: newTableData.is_active
      };
      
      // Call API to create new table
      const result = await createNewTable(tableData);
      
      // Reset form
      setNewTableData({
        capacity: 2,
        is_active: true
      });
      
      // Hide form
      setShowAddTableForm(false);
      
      // Refresh tables
      fetchTables();
      
      notify(`Table #${result.table_no} created successfully`, 'success');
    } catch (error) {
      console.error('Error creating table:', error);
      notify(`Error creating table: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function to handle toggling the active status
  const handleTableActiveStatusUpdate = async (tableNo, isActive) => {
    try {
      // Show loading state
      setIsLoading(true);
      
      // Call the API to update the table's active status
      await setTableActiveStatus(tableNo, isActive);
      
      // Update the local state to reflect the change
      setTables(prevTables => 
        prevTables.map(table => 
          table.table_no === tableNo 
            ? { ...table, is_active: isActive } 
            : table
        )
      );
      
      // Show success message
      notify(`Table ${tableNo} is now ${isActive ? 'active' : 'inactive'}`, 'success');
    } catch (error) {
      console.error('Error updating table active status:', error);
      notify(`Error updating table: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Update the Table Manager Modal component
  const TableManagerModal = () => {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Table Manager</h2>
            <button 
              className="close-modal-btn"
              onClick={() => setShowTableManager(false)}
            >
              &times;
            </button>
          </div>
          <div className="modal-body" style={{ padding: '1.5rem' }}>
            {/* Add New Table Button */}
            <div className="add-table-section">
              <button 
                className="add-table-btn"
                onClick={() => setShowAddTableForm(true)}
              >
                Add New Table
              </button>
            </div>
            
            {/* Add New Table Form */}
            {showAddTableForm && (
              <div className="add-table-form-container">
                <h3>Add New Table</h3>
                <form onSubmit={handleSubmitNewTable} className="add-table-form">
                  <div className="form-group">
                    <label htmlFor="capacity">Capacity:</label>
                    <input 
                      type="number" 
                      id="capacity"
                      name="capacity"
                      min="1"
                      max="20"
                      value={newTableData.capacity}
                      onChange={handleNewTableInputChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="is_active">Status:</label>
                    <select 
                      id="is_active"
                      name="is_active"
                      value={newTableData.is_active}
                      onChange={(e) => handleNewTableInputChange({
                        target: {
                          name: 'is_active',
                          value: e.target.value === 'true'
                        }
                      })}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  
                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="cancel-btn"
                      onClick={() => setShowAddTableForm(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="submit-btn"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating...' : 'Create Table'}
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Simplified Tables List with Status column removed */}
            <table className="tables-table">
              <thead>
                <tr>
                  <th>Table No</th>
                  <th>Capacity</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => (
                  <tr key={table.table_no} className={!table.is_active ? 'inactive-table' : ''}>
                    <td>{table.table_no}</td>
                    <td>{table.capacity}</td>
                    <td>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={table.is_active} 
                          onChange={() => handleTableActiveStatusUpdate(table.table_no, !table.is_active)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
  
  // Add a ref to track if the component is mounted
  const isMountedRef = useRef(true);
  
  // Add state to track last auto-cancel check time
  const [lastAutoCheckTime, setLastAutoCheckTime] = useState(Date.now());
  
  // Set up the auto-cancellation timer when component mounts
  useEffect(() => {
    // Check for auto-cancellations immediately on mount
    runAutoCancellation();
    
    // Set up interval to check every minute (60000 ms)
    const intervalId = setInterval(() => {
      if (isMountedRef.current) {
        runAutoCancellation();
      }
    }, 60000);
    
    // Set up event listener for reservation changes
    const handleReservationsChanged = () => {
      if (isMountedRef.current) {
        // Refresh data when reservations change
        fetchReservations();
        fetchReservationStats();
      }
    };
    
    window.addEventListener('reservationsChanged', handleReservationsChanged);
    
    // Clean up on unmount
    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
      window.removeEventListener('reservationsChanged', handleReservationsChanged);
    };
  }, []);
  
  // Function to run auto-cancellation process
  const runAutoCancellation = async () => {
    // Only run if it's been at least 1 minute since the last check
    const now = Date.now();
    if (now - lastAutoCheckTime < 60000) {
      return; // Skip if checked recently
    }
    
    try {
      // Update last check time
      setLastAutoCheckTime(now);
      
      // Call the service function
      const result = await autoCancelPendingReservations();
      
      // If any reservations were cancelled, refresh the data
      if (result && result.cancelledCount > 0) {
        console.log(`Auto-cancelled ${result.cancelledCount} pending reservations`);
        
        // Only notify if there were actual cancellations
        if (result.cancelledCount > 0) {
          notify(`Auto-cancelled ${result.cancelledCount} pending reservations that were approaching their scheduled time`, 'info');
        }
        
        // Refresh data after cancellations
        fetchReservations();
        fetchReservationStats();
      }
    } catch (error) {
      console.error('Error in auto-cancellation process:', error);
      // No user notification needed as this runs in the background
    }
  };
  
  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-content">
        <Header title="Table Reservations" />
        
        {/* Server Status Notifier */}
        {isServerDown && (
          <div className="server-status-notification warning">
            <p>
              <strong>Notice:</strong> Unable to connect to the server. Showing mock data. Real reservation data might differ.
            </p>
            <button onClick={handleRetryConnection}>
              Retry Connection
            </button>
          </div>
        )}
        
        <div className="reservations-overview">
          <div className="reservation-stat-card upcoming">
            <h3>Upcoming</h3>
            <p className="stat-number">{reservationStats.upcoming}</p>
          </div>
          <div className="reservation-stat-card completed">
            <h3>Completed</h3>
            <p className="stat-number">{reservationStats.completed}</p>
          </div>
          <div className="reservation-stat-card cancelled">
            <h3>Cancelled</h3>
            <p className="stat-number">{reservationStats.cancelled}</p>
          </div>
          <div className="reservation-stat-card total">
            <h3>Total</h3>
            <p className="stat-number">{reservationStats.total}</p>
          </div>
          
          {/* Add Table Management Button */}
          <div className="table-manager-button">
            <button 
              className="manage-tables-btn" 
              onClick={() => setShowTableManager(true)}
            >
              Manage Tables
            </button>
          </div>
        </div>

        <div className="filters-section">
          <div className="search-bar">
            <div className="search-container">
              <select 
                name="searchOption" 
                className="search-option-select"
                value={filters.searchOption}
                onChange={handleFilterChange}
              >
                <option value="all">All Fields</option>
                <option value="id">Reservation ID</option>
                <option value="customer">Customer Name</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="table">Table Number</option>
              </select>
              <input 
                name="searchTerm"
                value={filters.searchTerm}
                onChange={handleFilterChange}
                placeholder={`Search by ${filters.searchOption === 'all' ? 'any field' : filters.searchOption}...`}
              />
            </div>
          </div>
          
          <div className="filter-options">
            <select 
              name="status" 
              value={filters.status}  
              onChange={handleFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            
            {/* Date filters */}
            <div className="date-filters">
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleDateFilterChange}
                placeholder="Start Date"
              />
              <span>to</span>
              <input 
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleDateFilterChange}
                placeholder="End Date"
              />
            </div>
            
            <button className="reset-filters-btn" onClick={resetFilters}>
              Reset Filters
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="loading">Loading reservations...</div>
        ) : (          <div className="reservations-table-container">
            <table className="reservations-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Table</th>
                  <th>Date & Time</th>
                  <th>Duration</th>
                  <th>Guests</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.length > 0 ? (
                  filteredReservations.map((reservation) => (
                    <ReservationRow 
                      key={reservation.reserve_id || reservation.reservation_id}
                      reservation={reservation}
                      onViewDetails={handleViewDetails}
                      onStatusChange={handleUpdateStatus}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="no-reservations">
                      No reservations match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {pagination.pages > 1 && (
              <div className="pagination-controls">
                <button 
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 1}
                >
                  Previous
                </button>
                <span>Page {filters.page} of {pagination.pages}</span>
                <button 
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page === pagination.pages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Reservation Details Modal */}
        {isDetailsModalOpen && selectedReservation && (
          <div className="modal-overlay">
            <div className="modal-content reservation-details-modal">
              <div className="modal-header">
                <h2>Reservation #{selectedReservation.reserve_id || selectedReservation.reservation_id} Details</h2>
                <button 
                  className="close-modal-btn"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  &times;
                </button>
              </div>
              <div className="reservation-details-content">
                <div className="reservation-info-section">
                  <div className="reservation-info-group">
                    <h3>Reservation Information</h3>                    <p><strong>Status:</strong> {selectedReservation.status || 'Confirmed'}</p>
                    <p><strong>Date & Time:</strong> {formatDate(selectedReservation.date_time)}</p>
                    <p><strong>Duration:</strong> {selectedReservation.duration || 60} minutes</p>
                    <p><strong>Table Number:</strong> {selectedReservation.table_no}</p>
                    <p><strong>Guests:</strong> {selectedReservation.guests || selectedReservation.capacity || 'N/A'}</p>
                    <p><strong>Created:</strong> {formatDate(selectedReservation.created_at)}</p>
                  </div>
                  <div className="reservation-info-group">
                    <h3>Customer Information</h3>
                    <p><strong>Name:</strong> 
                      {selectedReservation.customer_name || 
                       (selectedReservation.first_name || selectedReservation.last_name ? 
                        `${selectedReservation.first_name || ''} ${selectedReservation.last_name || ''}`.trim() : 
                        'N/A')}
                    </p>
                    <p><strong>User ID:</strong> {selectedReservation.user_id || 'Guest'}</p>
                    <p><strong>Email:</strong> {selectedReservation.email || 'N/A'}</p>
                    <p><strong>Phone:</strong> {selectedReservation.phone_number || 'N/A'}</p>
                  </div>
                </div>
                {selectedReservation.special_requests && (
                  <div className="special-requests-section">
                    <h3>Special Requests</h3>
                    <p>{selectedReservation.special_requests}</p>
                  </div>
                )}
                <div className="reservation-actions-footer">
                  <select 
                    value={selectedReservation.status || 'Pending'}
                    onChange={(e) => {
                      handleUpdateStatus(
                        selectedReservation.reserve_id || selectedReservation.reservation_id, 
                        e.target.value
                      );
                      setSelectedReservation({...selectedReservation, status: e.target.value});
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <button className="print-reservation-btn">
                    Print Details
                  </button>
                  <button 
                    className="close-details-btn"
                    onClick={() => setIsDetailsModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Table Manager Modal */}
        {showTableManager && <TableManagerModal />}
        
      </main>
    </div>
  );
}

export default ReservationManagement;
