/**
 * Script to set up initial operating hours in the database
 */
const db = require('../config/db');
require('dotenv').config();

console.log('Starting setup of operating hours...');

// Check if operating_hours table exists
db.query('SHOW TABLES LIKE "operating_hours"', (err, results) => {
  if (err) {
    console.error('Error checking for operating_hours table:', err);
    db.end();
    return;
  }
  
  // Create table if it doesn't exist
  if (results.length === 0) {
    console.log('Creating operating_hours table...');
    
    const createTableSQL = `
    CREATE TABLE operating_hours (
      day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') PRIMARY KEY,
      open_time TIME NOT NULL COMMENT 'Opening time (e.g., 12:00:00 for 12:00 PM)',
      close_time TIME NOT NULL COMMENT 'Closing time (e.g., 22:00:00 for 10:00 PM)',
      is_open BOOLEAN DEFAULT TRUE COMMENT 'Indicates if restaurant is open on this day',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
    `;
    
    db.query(createTableSQL, (err) => {
      if (err) {
        console.error('Error creating operating_hours table:', err);
        db.end();
        return;
      }
      
      console.log('operating_hours table created successfully');
      setupDefaultHours();
    });
  } else {
    console.log('operating_hours table already exists');
    checkAndPopulateHours();
  }
});

// Check if there are any records in the table
function checkAndPopulateHours() {
  db.query('SELECT COUNT(*) as count FROM operating_hours', (err, results) => {
    if (err) {
      console.error('Error checking operating_hours records:', err);
      db.end();
      return;
    }
    
    if (results[0].count === 0) {
      console.log('No operating hours found. Setting up default hours...');
      setupDefaultHours();
    } else {
      console.log(`Found ${results[0].count} operating hours records. No need to set up defaults.`);
      db.end();
    }
  });
}

// Insert default operating hours for all days of the week
function setupDefaultHours() {
  // Default operating hours (12 PM to 10 PM on weekdays, 10 AM to 11 PM on weekends)
  const defaultHours = [
    { day_of_week: 'Monday', open_time: '12:00:00', close_time: '22:00:00', is_open: true },
    { day_of_week: 'Tuesday', open_time: '12:00:00', close_time: '22:00:00', is_open: true },
    { day_of_week: 'Wednesday', open_time: '12:00:00', close_time: '22:00:00', is_open: true },
    { day_of_week: 'Thursday', open_time: '12:00:00', close_time: '22:00:00', is_open: true },
    { day_of_week: 'Friday', open_time: '12:00:00', close_time: '22:00:00', is_open: true },
    { day_of_week: 'Saturday', open_time: '10:00:00', close_time: '23:00:00', is_open: true },
    { day_of_week: 'Sunday', open_time: '10:00:00', close_time: '23:00:00', is_open: true }
  ];
  
  // Insert each day's hours
  let insertedCount = 0;
  
  defaultHours.forEach((dayHours) => {
    db.query('INSERT INTO operating_hours SET ?', dayHours, (err) => {
      if (err) {
        console.error(`Error inserting hours for ${dayHours.day_of_week}:`, err);
      } else {
        console.log(`Default hours set for ${dayHours.day_of_week}`);
        insertedCount++;
        
        // Close DB connection when all days are processed
        if (insertedCount === defaultHours.length) {
          console.log('All default operating hours have been set up successfully!');
          db.end();
        }
      }
    });
  });
}