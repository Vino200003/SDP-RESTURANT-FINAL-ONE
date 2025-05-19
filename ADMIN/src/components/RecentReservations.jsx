import { useState, useEffect } from 'react';
import { getAllReservations, getReservationStatus } from '../services/reservationService';
import '../styles/RecentReservations.css';

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
        // Handle case where the API returns an array directly
        setReservations(response.slice(0, 5));
      } else {
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
  
  return (
    <div className="recent-reservations-card">
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
        <table className="reservations-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Time</th>
              <th>Table</th>
              <th>Guests</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => {
              const status = getReservationStatus(reservation);
              return (
                <tr key={reservation.reserve_id || reservation.reservation_id}>
                  <td>{reservation.reserve_id || reservation.reservation_id}</td>
                  <td>
                    {reservation.customer_name || 
                      (reservation.first_name || reservation.last_name ? 
                        `${reservation.first_name || ''} ${reservation.last_name || ''}`.trim() : 
                        `User ${reservation.user_id}` || 'Guest')}
                  </td>
                  <td>{formatDateOnly(reservation.date_time)}</td>
                  <td>{formatDate(reservation.date_time)}</td>
                  <td>Table {reservation.table_no}</td>
                  <td>{reservation.guests || reservation.capacity || 'N/A'}</td>
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
        <div className="no-reservations-message">
          No reservations found for today. New reservations will appear here.
        </div>
      )}
    </div>
  );
}

export default RecentReservations;
