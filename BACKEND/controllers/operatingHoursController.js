const db = require('../config/db');

/**
 * Get all operating hours
 */
exports.getAllOperatingHours = (req, res) => {
  try {
    const query = 'SELECT * FROM operating_hours ORDER BY FIELD(day_of_week, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")';
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching operating hours:', err);
        return res.status(500).json({ 
          message: 'Error fetching operating hours', 
          error: err.message 
        });
      }
      
      res.json(results);
    });
  } catch (error) {
    console.error('Server error in getAllOperatingHours:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get operating hours for a specific day
 */
exports.getOperatingHoursByDay = (req, res) => {
  try {
    const { day } = req.params;
    
    // Validate day of week
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day)) {
      return res.status(400).json({ message: 'Invalid day of week' });
    }
    
    const query = 'SELECT * FROM operating_hours WHERE day_of_week = ?';
    
    db.query(query, [day], (err, results) => {
      if (err) {
        console.error(`Error fetching operating hours for ${day}:`, err);
        return res.status(500).json({ 
          message: `Error fetching operating hours for ${day}`, 
          error: err.message 
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: `Operating hours not found for ${day}` });
      }
      
      res.json(results[0]);
    });
  } catch (error) {
    console.error('Server error in getOperatingHoursByDay:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update operating hours for a specific day
 */
exports.updateOperatingHours = (req, res) => {
  try {
    const { day } = req.params;
    const { open_time, close_time, is_open } = req.body;
    
    // Validate day of week
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day)) {
      return res.status(400).json({ message: 'Invalid day of week' });
    }
    
    // Validate required fields
    if (!open_time || !close_time) {
      return res.status(400).json({ message: 'Open time and close time are required' });
    }
    
    // Convert the boolean value properly
    const isOpenValue = is_open === undefined ? true : Boolean(is_open);
    
    const updateData = {
      open_time,
      close_time,
      is_open: isOpenValue,
      updated_at: new Date()
    };
    
    const query = 'UPDATE operating_hours SET ? WHERE day_of_week = ?';
    
    db.query(query, [updateData, day], (err, result) => {
      if (err) {
        console.error(`Error updating operating hours for ${day}:`, err);
        return res.status(500).json({ 
          message: `Error updating operating hours for ${day}`, 
          error: err.message 
        });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: `Operating hours not found for ${day}` });
      }
      
      // Get updated record
      db.query('SELECT * FROM operating_hours WHERE day_of_week = ?', [day], (err, results) => {
        if (err) {
          console.error(`Error fetching updated operating hours for ${day}:`, err);
          return res.status(200).json({ 
            message: `Operating hours updated for ${day}`,
            day
          });
        }
        
        res.status(200).json({
          message: `Operating hours updated for ${day}`,
          operatingHours: results[0]
        });
      });
    });
  } catch (error) {
    console.error('Server error in updateOperatingHours:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update operating hours for multiple days in one request
 */
exports.batchUpdateOperatingHours = (req, res) => {
  try {
    const updatedHours = req.body;
    
    if (!Array.isArray(updatedHours) || updatedHours.length === 0) {
      return res.status(400).json({ message: 'Invalid data format, expected array of operating hours' });
    }
    
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const errors = [];
    const updates = [];
    
    // Process each day's update
    updatedHours.forEach(async (dayHours) => {
      const { day_of_week, open_time, close_time, is_open } = dayHours;
      
      if (!validDays.includes(day_of_week)) {
        errors.push(`Invalid day: ${day_of_week}`);
        return;
      }
      
      if (!open_time || !close_time) {
        errors.push(`Open time and close time are required for ${day_of_week}`);
        return;
      }
      
      // Convert the boolean value properly
      const isOpenValue = is_open === undefined ? true : Boolean(is_open);
      
      const updateData = {
        open_time,
        close_time,
        is_open: isOpenValue,
        updated_at: new Date()
      };
      
      updates.push(new Promise((resolve, reject) => {
        db.query(
          'UPDATE operating_hours SET ? WHERE day_of_week = ?',
          [updateData, day_of_week],
          (err, result) => {
            if (err) {
              reject({ day: day_of_week, error: err.message });
              return;
            }
            resolve({ day: day_of_week, updated: result.affectedRows > 0 });
          }
        );
      }));
    });
    
    // Execute all updates
    Promise.all(updates.map(p => p.catch(e => e)))
      .then(results => {
        const failedUpdates = results.filter(result => result.error);
        
        if (errors.length > 0 || failedUpdates.length > 0) {
          const errorMessages = [
            ...errors,
            ...failedUpdates.map(f => `Failed to update ${f.day}: ${f.error}`)
          ];
          
          return res.status(400).json({
            message: 'Some updates failed',
            errors: errorMessages,
            successes: results.filter(r => !r.error)
          });
        }
        
        res.status(200).json({
          message: 'All operating hours updated successfully',
          updated: results
        });
      })
      .catch(error => {
        console.error('Error in batch update:', error);
        res.status(500).json({ message: 'Error updating operating hours', error: error.message });
      });
  } catch (error) {
    console.error('Server error in batchUpdateOperatingHours:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Check if the restaurant is currently open
 */
exports.checkIfRestaurantOpen = (req, res) => {
  try {
    // Get current day and time
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];
    
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinutes}:00`;
    
    // Get operating hours for today
    const query = 'SELECT * FROM operating_hours WHERE day_of_week = ?';
    
    db.query(query, [currentDay], (err, results) => {
      if (err) {
        console.error('Error checking operating hours:', err);
        return res.status(500).json({ 
          message: 'Error checking operating hours', 
          error: err.message 
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ 
          message: 'Operating hours not found for today',
          isOpen: false 
        });
      }
      
      const { is_open, open_time, close_time } = results[0];
      
      // Check if restaurant is marked as closed for the day
      if (is_open === 0) {
        return res.json({ 
          isOpen: false,
          reason: 'Restaurant is closed for today' 
        });
      }
      
      // Check if current time is between opening and closing times
      const isOpen = currentTime >= open_time && currentTime <= close_time;
      
      res.json({ 
        isOpen,
        currentDay,
        currentTime,
        openTime: open_time,
        closeTime: close_time,
        reason: isOpen ? 'Restaurant is open' : 'Outside operating hours'
      });
    });
  } catch (error) {
    console.error('Server error in checkIfRestaurantOpen:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      isOpen: false 
    });
  }
};

/**
 * Utility function to check if restaurant is open (for internal use)
 * Returns a promise that resolves to {isOpen: boolean, reason: string}
 */
exports.isRestaurantOpenNow = () => {
  return new Promise((resolve, reject) => {
    try {
      // Get current day and time
      const now = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDay = days[now.getDay()];
      
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHour}:${currentMinutes}:00`;
      
      // Get operating hours for today
      const query = 'SELECT * FROM operating_hours WHERE day_of_week = ?';
      
      db.query(query, [currentDay], (err, results) => {
        if (err) {
          console.error('Error checking operating hours:', err);
          return resolve({ isOpen: false, reason: 'Error checking hours' });
        }
        
        if (results.length === 0) {
          return resolve({ isOpen: false, reason: 'No operating hours set for today' });
        }
        
        const { is_open, open_time, close_time } = results[0];
        
        // Check if restaurant is marked as closed for the day
        if (is_open === 0) {
          return resolve({ isOpen: false, reason: 'Restaurant is closed today' });
        }
        
        // Check if current time is between opening and closing times
        const isOpen = currentTime >= open_time && currentTime <= close_time;
        
        resolve({ 
          isOpen, 
          reason: isOpen ? 'Restaurant is open' : 'Outside operating hours',
          currentTime,
          openTime: open_time,
          closeTime: close_time
        });
      });
    } catch (error) {
      console.error('Server error checking if restaurant is open:', error);
      resolve({ isOpen: false, reason: 'Error checking if restaurant is open' });
    }
  });
};