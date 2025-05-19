import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  getAllOperatingHours, 
  updateOperatingHours 
} from '../services/operatingHoursService';
import '../styles/OperatingHours.css';

function OperatingHours() {
  const [operatingHours, setOperatingHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOperatingHours();
  }, []);

  // Format time from 24hr to 12hr format for display
  const formatTimeToDisplay = (timeString) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };
  // Format time from input to 24hr format for database
  const formatTimeForDatabase = (timeString) => {
    // Just return the time string as is, MySQL expects HH:MM format
    return timeString;
  };

  // Fetch all operating hours
  const fetchOperatingHours = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllOperatingHours();
      setOperatingHours(data);
    } catch (error) {
      console.error('Error fetching operating hours:', error);
      setError('Failed to load operating hours');
      toast.error('Failed to load operating hours');
    } finally {
      setLoading(false);
    }
  };

  // Handle change in form input
  const handleChange = (dayOfWeek, field, value) => {
    setOperatingHours(prev => prev.map(dayHours => 
      dayHours.day_of_week === dayOfWeek 
        ? { ...dayHours, [field]: value }
        : dayHours
    ));
  };

  // Handle update of operating hours for a specific day
  const handleUpdate = async (dayOfWeek) => {
    const day = operatingHours.find(day => day.day_of_week === dayOfWeek);
    
    if (!day) return;

    if (!day.open_time || !day.close_time) {
      toast.error('Please provide both opening and closing times');
      return;
    }

    try {
      setUpdating(true);
      
      // Format times for database
      const updatedDay = {
        open_time: formatTimeForDatabase(day.open_time),
        close_time: formatTimeForDatabase(day.close_time),
        is_open: day.is_open
      };

      await updateOperatingHours(dayOfWeek, updatedDay);
      toast.success(`Updated operating hours for ${dayOfWeek}`);
    } catch (error) {
      console.error(`Error updating ${dayOfWeek} operating hours:`, error);
      toast.error(`Failed to update ${dayOfWeek} operating hours`);
    } finally {
      setUpdating(false);
    }
  };

  // Handle batch update of all days
  const handleBatchUpdate = async () => {
    try {
      setUpdating(true);
      
      // Format all days for database
      const updatedHours = operatingHours.map(day => ({
        day_of_week: day.day_of_week,
        open_time: formatTimeForDatabase(day.open_time),
        close_time: formatTimeForDatabase(day.close_time),
        is_open: day.is_open
      }));

      await Promise.all(updatedHours.map(day => 
        updateOperatingHours(day.day_of_week, {
          open_time: day.open_time,
          close_time: day.close_time,
          is_open: day.is_open
        })
      ));

      toast.success('Updated all operating hours');
    } catch (error) {
      console.error('Error updating operating hours:', error);
      toast.error('Failed to update operating hours');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="loading-indicator">Loading operating hours...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="operating-hours-container">
      <h3>Restaurant Operating Hours</h3>
      <p className="section-description">
        Set your restaurant's opening and closing times for each day of the week.
      </p>

      <table className="operating-hours-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Status</th>
            <th>Opening Time</th>
            <th>Closing Time</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {operatingHours.map((day) => (
            <tr key={day.day_of_week}>
              <td>{day.day_of_week}</td>
              <td>
                <div className="toggle-container">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={day.is_open === 1}
                      onChange={(e) => handleChange(day.day_of_week, 'is_open', e.target.checked ? 1 : 0)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className={`status-text ${day.is_open === 1 ? 'open' : 'closed'}`}>
                    {day.is_open === 1 ? 'Open' : 'Closed'}
                  </span>
                </div>
              </td>
              <td>
                <input
                  type="time"
                  value={day.open_time ? day.open_time.substring(0, 5) : ''} // Extract HH:MM part only
                  onChange={(e) => handleChange(day.day_of_week, 'open_time', e.target.value)}
                  disabled={day.is_open === 0}
                />
              </td>
              <td>
                <input
                  type="time"
                  value={day.close_time ? day.close_time.substring(0, 5) : ''} // Extract HH:MM part only
                  onChange={(e) => handleChange(day.day_of_week, 'close_time', e.target.value)}
                  disabled={day.is_open === 0}
                />
              </td>
              <td>
                <button 
                  className="update-btn"
                  onClick={() => handleUpdate(day.day_of_week)}
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Update'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="hours-actions">
        <button
          className="update-all-btn"
          onClick={handleBatchUpdate}
          disabled={updating}
        >
          {updating ? 'Updating All...' : 'Update All Hours'}
        </button>
      </div>
    </div>
  );
}

export default OperatingHours;