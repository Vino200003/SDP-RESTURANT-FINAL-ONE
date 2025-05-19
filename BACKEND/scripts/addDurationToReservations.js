/**
 * Script to add the duration column to the reservations table
 * Duration represents how long a reservation will last, with a default of 60 minutes
 */

const db = require('../config/db');

// Connect to the database and add the duration column if it doesn't exist
async function addDurationColumn() {
  try {
    console.log('Checking if duration column exists in reservations table...');
    
    // First check if the column already exists
    const [columns] = await db.execute('SHOW COLUMNS FROM reservations');
    const durationColumnExists = columns.some(column => column.Field === 'duration');
    
    if (durationColumnExists) {
      console.log('Duration column already exists. No changes needed.');
    } else {
      console.log('Adding duration column to reservations table...');
      
      // Add the duration column with a default value of 60 minutes
      await db.execute('ALTER TABLE reservations ADD COLUMN duration INT DEFAULT 60');
      
      console.log('Duration column added successfully with default value of 60 minutes.');
    }
    
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error executing migration:', error);
    process.exit(1);
  }
}

// Run the migration
addDurationColumn();
