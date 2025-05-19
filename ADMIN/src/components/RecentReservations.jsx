import { useState, useEffect } from 'react';
import { getAllReservations } from '../services/reservationService';
import '../styles/RecentOrders.css'; // Reuse the same CSS for consistent styling

function RecentReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchRecentReservations();
  }, []);
  
  const fetchRecentReservations = async () => {
    try {
      setLoading(true);
      // Get only recent reservations with a limit of 5
      const response = await getAllReservations({ page: 1, limit: 5 });
      
      if (response && response.reservations) {
        setReservations(response.reservations);
      } else if (Array.isArray(response)) {
        // Handle case where API returns array directly
        setReservations(response.slice(0, 5));
      } else {
        // Handle case where the API doesn't return expected data
        setReservations([]);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error fetching recent reservations:', error);
      setError('Failed to load recent reservations. API endpoint might not be ready yet.');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Format date from ISO string to readable format
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const options = { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    };
    return new Date(dateString).toLocaleTimeString(undefined, options);
  };
  
  // Format date to show only the date part
  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Get status badge class based on reservation status
  const getStatusClass = (status) => {
    switch (status) {
      case 'Confirmed': return 'status-confirmed';
      case 'Completed': return 'status-completed';
      case 'Cancelled': return 'status-cancelled';
      case 'Pending': return 'status-pending';
      default: return '';
    }
  };
  
  // Get the status from the reservation object, handling different field names
  const getReservationStatus = (reservation) => {
    return reservation.status || 
           reservation.reservation_status || 
           reservation.reserve_status || 
           'Pending';
  };
  
  return (
    <div className="recent-orders-card">
      <div className="card-header">
        <h2>Today's Reservations</h2>
        <button className="view-all-button" onClick={fetchRecentReservations}>Refresh</button>
      </div>
      
      {loading ? (
        <div className="loading-indicator">Loading recent reservations...</div>
      ) : error ? (
        <div className="error-message">
          {error}
          <button onClick={fetchRecentReservations} className="retry-button">Retry</button>
        </div>
      ) : reservations.length > 0 ? (
        <table className="orders-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Time</th>
              <th>Table</th>
              <th>Guests</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => {
              const id = reservation.reserve_id || reservation.reservation_id;
              const status = getReservationStatus(reservation);
              const name = reservation.customer_name || 
                          (reservation.first_name || reservation.last_name ? 
                            `${reservation.first_name || ''} ${reservation.last_name || ''}`.trim() : 
                            'Guest');
              
              return (
                <tr key={id}>
                  <td>{id}</td>
                  <td>{name}</td>
                  <td>{formatDate(reservation.date_time)}</td>
                  <td>Table {reservation.table_no}</td>
                  <td>{reservation.guests || reservation.capacity || 2}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(status)}`}>
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="no-orders-message">
          No upcoming reservations found. New reservations will appear here.
        </div>
      )}
    </div>
  );
}

export default RecentReservations;
