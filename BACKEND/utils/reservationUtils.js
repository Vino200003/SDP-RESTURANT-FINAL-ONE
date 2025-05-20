/**
 * Utility functions for reservation operations
 */

const db = require('../config/db');

/**
 * Check if a table is available at a specific date and time
 * @param {number} tableNo - Table number to check
 * @param {Date} dateTime - Date and time for the reservation
 * @param {number} excludeReservationId - Optional reservation ID to exclude (for updates)
 * @returns {Promise<boolean>} - True if the table is available, false otherwise
 */
exports.isDateTimeAvailable = (tableNo, dateTime, excludeReservationId = null) => {
  return new Promise((resolve, reject) => {
    // Convert date to string for comparison
    const requestedDate = dateTime.toISOString().slice(0, 19).replace('T', ' ');
    
    // Stricter validation: Only allow one reservation per table per time slot
    // We don't allow overlapping time slots within 2 hours of each other
    let query = `
      SELECT COUNT(*) AS count 
      FROM reservations 
      WHERE table_no = ? 
      AND status NOT IN ('Cancelled', 'No-Show')
      AND ABS(TIMESTAMPDIFF(MINUTE, date_time, ?)) < 120
    `;
    
    const params = [tableNo, requestedDate];
    
    // If we're updating an existing reservation, exclude it from the check
    if (excludeReservationId) {
      query += ' AND reserve_id <> ?';
      params.push(excludeReservationId);
    }
    
    console.log('Checking table availability with query:', query);
    console.log('Query params:', params);
    
    db.query(query, params, (err, results) => {
      if (err) {
        console.error('Database error checking availability:', err);
        reject(err);
        return;
      }
      
      console.log('Availability check results:', results);
      
      // If count is 0, the table is available
      resolve(results[0].count === 0);
    });
  });
};

/**
 * Check if a given time slot is generally available in the restaurant
 * @param {Date} dateTime - Date and time to check
 * @returns {boolean} - True if the time is generally available, false otherwise
 */
exports.isTimeSlotAvailable = (dateTime) => {
  // Convert to date object if string was provided
  const checkDate = new Date(dateTime);
  
  // Get day of week (0 = Sunday, 6 = Saturday)
  const day = checkDate.getDay();
  
  // Get hours and minutes
  const hours = checkDate.getHours();
  const minutes = checkDate.getMinutes();
  
  // Convert to 24-hour time value for easy comparison (e.g., 13:30 = 13.5)
  const timeValue = hours + (minutes / 60);
  
  // Check if within business hours (example: 11:00 AM to 10:00 PM)
  const openTime = 11; // 11:00 AM
  const closeTime = 22; // 10:00 PM
  
  // Check if the day is a weekday or weekend
  const isWeekend = day === 0 || day === 6;
  
  // Weekend might have different hours
  const adjustedOpenTime = isWeekend ? 10 : openTime; // Open earlier on weekends
  const adjustedCloseTime = isWeekend ? 23 : closeTime; // Close later on weekends
  
  // Check if time is within business hours
  return timeValue >= adjustedOpenTime && timeValue <= adjustedCloseTime;
};

/**
 * Get all tables with availability status for a specific date and time
 * @param {Date} dateTime - Date and time to check availability for
 * @returns {Promise<Array>} - Array of tables with availability status
 */
exports.getAvailableTables = (dateTime) => {
  return new Promise((resolve, reject) => {
    // Get all tables that are active
    db.query('SELECT * FROM tables WHERE is_active = TRUE ORDER BY table_no', async (err, tables) => {
      if (err) {
        reject(err);
        return;
      }
      
      try {
        // Format date for query
        const requestedDate = dateTime.toISOString().slice(0, 19).replace('T', ' ');
        
        // Use a single query to get all reserved tables within 2 hours window
        const reservationsQuery = `
          SELECT table_no
          FROM reservations 
          WHERE status NOT IN ('Cancelled', 'No-Show')
          AND ABS(TIMESTAMPDIFF(MINUTE, date_time, ?)) < 120
        `;
        
        console.log(`Checking reservations near ${requestedDate}`);
        
        const reservedTables = await new Promise((resolveReservations, rejectReservations) => {
          db.query(reservationsQuery, [requestedDate], (reservationErr, reservationResults) => {
            if (reservationErr) {
              console.error("DB error checking existing reservations:", reservationErr);
              rejectReservations(reservationErr);
              return;
            }
            
            // Create a Set of reserved table numbers for quick lookups
            const reservedTableSet = new Set();
            
            if (reservationResults && reservationResults.length > 0) {
              reservationResults.forEach(row => {
                console.log(`Table ${row.table_no} is reserved`);
                reservedTableSet.add(row.table_no);
              });
            }
            
            resolveReservations(reservedTableSet);
          });
        });
        
        // Mark tables as available only if they're not in the reserved set
        const tablesWithAvailability = tables.map(table => {
          const isAvailable = !reservedTables.has(table.table_no);
          return {
            ...table,
            available: isAvailable,
            reservation_status: isAvailable ? 'Available' : 'Reserved'
          };
        });
        
        console.log(`Processed ${tables.length} tables, ${tablesWithAvailability.filter(t => t.available).length} available`);
        resolve(tablesWithAvailability);
      } catch (error) {
        console.error("Error determining table availability:", error);
        reject(error);
      }
    });
  });
};

/**
 * Get reservations for a specific date
 * @param {Date} date - Date to fetch reservations for
 * @returns {Promise<Array>} - Array of reservations for the specified date
 */
exports.getReservationsByDate = (date) => {
  return new Promise((resolve, reject) => {
    // Format date for SQL query (YYYY-MM-DD)
    const dateString = date.toISOString().split('T')[0];
    
    const query = `
      SELECT r.*, u.first_name, u.last_name, u.email, u.phone_number, t.capacity
      FROM reservations r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN tables t ON r.table_no = t.table_no
      WHERE DATE(r.date_time) = ?
      ORDER BY r.date_time
    `;
    
    db.query(query, [dateString], (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      
      resolve(results);
    });
  });
};

/**
 * Check if a table exists and is active
 * @param {number} tableNo - Table number to check
 * @returns {Promise<boolean>} - True if the table exists and is active, false otherwise
 */
exports.tableExists = (tableNo) => {
  return new Promise((resolve, reject) => {
    db.query('SELECT 1 FROM tables WHERE table_no = ? AND is_active = TRUE', [tableNo], (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      
      resolve(results.length > 0);
    });
  });
};

/**
 * Get reservations with pagination and filters
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @param {string} options.status - Reservation status filter
 * @param {Date} options.startDate - Start date filter
 * @param {Date} options.endDate - End date filter
 * @returns {Promise<Object>} - Reservations and pagination info
 */
exports.getReservationsWithFilters = (options = {}) => {
  return new Promise((resolve, reject) => {
    // Default options
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;
    
    // Build query conditions
    let conditions = [];
    let params = [];
    
    // Status filter
    if (options.status) {
      conditions.push('r.status = ?');
      params.push(options.status);
    }
    
    // Date range filter
    if (options.startDate && options.endDate) {
      conditions.push('DATE(r.date_time) BETWEEN ? AND ?');
      params.push(
        options.startDate.toISOString().split('T')[0],
        options.endDate.toISOString().split('T')[0]
      );
    } else if (options.startDate) {
      conditions.push('DATE(r.date_time) >= ?');
      params.push(options.startDate.toISOString().split('T')[0]);
    } else if (options.endDate) {
      conditions.push('DATE(r.date_time) <= ?');
      params.push(options.endDate.toISOString().split('T')[0]);
    }
    
    // Combine conditions
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count first
    const countQuery = `
      SELECT COUNT(*) AS total 
      FROM reservations r
      ${whereClause}
    `;
    
    db.query(countQuery, params, (countErr, countResults) => {
      if (countErr) {
        reject(countErr);
        return;
      }
      
      const total = countResults[0].total;
      const pages = Math.ceil(total / limit);
      
      // Get paginated results
      const query = `
        SELECT r.*, u.first_name, u.last_name, u.email, u.phone_number, t.capacity
        FROM reservations r
        LEFT JOIN users u ON r.user_id = u.user_id
        LEFT JOIN tables t ON r.table_no = t.table_no
        ${whereClause}
        ORDER BY r.date_time DESC
        LIMIT ? OFFSET ?
      `;
      
      // Add pagination params
      const fullParams = [...params, limit, offset];
      
      db.query(query, fullParams, (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Add customer_name field for frontend consistency
        const reservations = results.map(reservation => {
          if (reservation.first_name || reservation.last_name) {
            reservation.customer_name = `${reservation.first_name || ''} ${reservation.last_name || ''}`.trim();
          }
          return reservation;
        });
        
        resolve({
          reservations,
          pagination: {
            page,
            limit,
            total,
            pages
          }
        });
      });
    });
  });
};

/**
 * Get all tables with their current status
 * @returns {Promise<Array>} - Array of all tables with their status
 */
exports.getAllTables = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT t.*, 
             CASE 
               WHEN EXISTS (
                 SELECT 1 FROM reservations r 
                 WHERE r.table_no = t.table_no 
                 AND r.status IN ('Pending', 'Confirmed')
                 AND ABS(TIMESTAMPDIFF(MINUTE, r.date_time, NOW())) < 120
               ) THEN 'Reserved' 
               ELSE t.status 
             END as current_status
      FROM tables t
      ORDER BY t.table_no
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      
      resolve(results);
    });
  });
};

/**
 * Update table status
 * @param {number} tableNo - Table number to update
 * @param {string} status - New status ('Available' or 'Reserved')
 * @returns {Promise<Object>} - Result of the update operation
 */
exports.updateTableStatus = (tableNo, status) => {
  return new Promise((resolve, reject) => {
    if (!['Available', 'Reserved'].includes(status)) {
      reject(new Error('Invalid status. Must be either Available or Reserved'));
      return;
    }
    
    db.query('UPDATE tables SET status = ? WHERE table_no = ?', [status, tableNo], (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      
      resolve({
        message: `Table ${tableNo} status updated to ${status}`,
        affectedRows: result.affectedRows
      });
    });
  });
};

/**
 * Toggle table active status
 * @param {number} tableNo - Table number to update
 * @param {boolean} isActive - Whether the table should be active or not
 * @returns {Promise<Object>} - Result of the update operation
 */
exports.setTableActiveStatus = (tableNo, isActive) => {
  return new Promise((resolve, reject) => {
    db.query('UPDATE tables SET is_active = ? WHERE table_no = ?', [isActive, tableNo], (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      
      resolve({
        message: `Table ${tableNo} is now ${isActive ? 'active' : 'inactive'}`,
        affectedRows: result.affectedRows
      });
    });
  });
};

/**
 * Cancel unconfirmed reservations that are approaching their scheduled time
 * If a reservation is still 'Pending' and less than 2 hours before scheduled time,
 * automatically mark it as 'Cancelled'
 * @returns {Promise<Object>} - Result of the operation with count of cancelled reservations
 */
exports.cancelUnconfirmedReservations = () => {
  return new Promise((resolve, reject) => {
    // Find reservations that are:
    // 1. In Pending status
    // 2. Less than 2 hours away from their scheduled time
    // 3. In the future (not past reservations)
    const query = `
      UPDATE reservations
      SET status = 'Cancelled'
      WHERE status = 'Pending'
      AND date_time > NOW() 
      AND date_time < DATE_ADD(NOW(), INTERVAL 2 HOUR)
    `;
    
    db.query(query, (err, result) => {
      if (err) {
        console.error('Error cancelling unconfirmed reservations:', err);
        reject(err);
        return;
      }
      
      resolve({
        message: 'Auto-cancelled unconfirmed reservations',
        cancelledCount: result.affectedRows
      });
    });
  });
};
