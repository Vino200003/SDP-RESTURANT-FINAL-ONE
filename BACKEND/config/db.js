// config/db.js
const mysql = require('mysql2');
require('dotenv').config();  // To use environment variables from .env file

// Log database connection details (without password)
console.log('Connecting to database:');
console.log('Host:', process.env.DB_HOST);
console.log('User:', process.env.DB_USER);
console.log('Database:', process.env.DB_NAME);

// Create a connection to the database
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'kashinovi.M03',
  database: process.env.DB_NAME || 'Restaurant_system'
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    console.error('Please check your database credentials and make sure MySQL server is running');
    // Don't exit the process, just log the error
    return;
  }
  console.log('Connected to the MySQL database successfully');
  
  // Verify the users table exists first (keeping existing functionality)
  db.query('SHOW TABLES LIKE "users"', (err, results) => {
    if (err) {
      console.error('Error checking for users table:', err);
      return;
    }
    
    if (results.length === 0) {
      console.warn('Warning: users table does not exist!');
      console.log('Creating users table...');
      
      // SQL to create the users table with is_admin column
      const createTableSQL = `
        CREATE TABLE users (
          user_id INT AUTO_INCREMENT PRIMARY KEY,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE,
          phone_number VARCHAR(15) UNIQUE NOT NULL,
          address VARCHAR(255) NOT NULL,
          password VARCHAR(255) NOT NULL,
          is_admin TINYINT(1) DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;
      
      db.query(createTableSQL, (err, result) => {
        if (err) {
          console.error('Error creating users table:', err);
          return;
        }
        console.log('Users table created successfully');
        
        // Create a default admin user
        createDefaultAdmin(db);
      });
    } else {
      // Check if is_admin column exists
      db.query('SHOW COLUMNS FROM users LIKE "is_admin"', (err, results) => {
        if (err) {
          console.error('Error checking for is_admin column:', err);
          return;
        }
        
        if (results.length === 0) {
          console.log('Adding is_admin column to users table...');
          
          db.query('ALTER TABLE users ADD COLUMN is_admin TINYINT(1) DEFAULT 0', (err) => {
            if (err) {
              console.error('Error adding is_admin column:', err);
              return;
            }
            console.log('Added is_admin column successfully');
            
            // Create a default admin user
            createDefaultAdmin(db);
          });
        } else {
          console.log('Users table with is_admin column exists - database setup complete');
          
          // Check if admin user exists
          db.query('SELECT * FROM users WHERE is_admin = 1 LIMIT 1', (err, results) => {
            if (err) {
              console.error('Error checking for admin user:', err);
              return;
            }
            
            if (results.length === 0) {
              createDefaultAdmin(db);
            } else {
              console.log('Admin user exists - ready to go!');
              console.log('Default credentials:');
              console.log('- Email: admin@restaurant.com (or existing admin email)');
              console.log('- Password: admin123 (for default admin only)');
            }
          });
        }
      });
    }
  });
  
  // Check if the admin table exists
  db.query('SHOW TABLES LIKE "admin"', (err, results) => {
    if (err) {
      console.error('Error checking for admin table:', err);
      return;
    }
    
    if (results.length === 0) {
      console.warn('Warning: admin table does not exist!');
      console.log('Creating admin table...');
      
      // SQL to create the admin table
      const createAdminTableSQL = `
        CREATE TABLE admin (
            admin_id INT AUTO_INCREMENT PRIMARY KEY,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            phone_number VARCHAR(15),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;
      
      db.query(createAdminTableSQL, (err, result) => {
        if (err) {
          console.error('Error creating admin table:', err);
          return;
        }
        console.log('Admin table created successfully');
        
        // Create a default admin user
        createDefaultAdminUser(db);
      });
    } else {
      console.log('Admin table exists - checking for admin user');
      
      // Check if any admin exists in the table
      db.query('SELECT * FROM admin LIMIT 1', (err, results) => {
        if (err) {
          console.error('Error checking for admin user:', err);
          return;
        }
        
        if (results.length === 0) {
          createDefaultAdminUser(db);
        } else {
          console.log('Admin user exists - ready to go!');
          console.log('Default admin credentials (if using default):');
          console.log('- Email: admin@restaurant.com');
          console.log('- Password: admin123');
        }
      });
    }
  });
});

// Function to create a default admin user
function createDefaultAdmin(db) {
  const bcrypt = require('bcryptjs');
  
  // Hash the password
  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      console.error('Error generating salt:', err);
      return;
    }
    
    bcrypt.hash('admin123', salt, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        return;
      }
      
      const adminUser = {
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@restaurant.com',
        phone_number: '1234567890',
        address: 'Restaurant Address',
        password: hash,
        is_admin: 1
      };
      
      // Check if admin already exists
      db.query('SELECT * FROM users WHERE email = ?', [adminUser.email], (err, results) => {
        if (err) {
          console.error('Error checking for existing admin:', err);
          return;
        }
        
        if (results.length > 0) {
          console.log('Admin user already exists');
          
          // Update the user to be an admin if not already
          db.query('UPDATE users SET is_admin = 1 WHERE email = ?', [adminUser.email], (err) => {
            if (err) {
              console.error('Error updating user to admin:', err);
            } else {
              console.log('Updated existing user to admin role');
            }
          });
          
          return;
        }
        
        // Create admin user
        db.query('INSERT INTO users SET ?', adminUser, (err, result) => {
          if (err) {
            console.error('Error creating admin user:', err);
            
            // If the error is due to duplicate entry for phone_number, try with a different one
            if (err.code === 'ER_DUP_ENTRY' && err.sqlMessage.includes('phone_number')) {
              adminUser.phone_number = '9876543210';
              db.query('INSERT INTO users SET ?', adminUser, (err2, result2) => {
                if (err2) {
                  console.error('Error creating admin user with alternate phone:', err2);
                  return;
                }
                console.log('Default admin user created successfully with alternate phone');
                console.log('Email: admin@restaurant.com');
                console.log('Password: admin123');
              });
            }
            return;
          }
          console.log('Default admin user created successfully');
          console.log('Email: admin@restaurant.com');
          console.log('Password: admin123');
        });
      });
    });
  });
}

// Function to create a default admin user in the admin table
function createDefaultAdminUser(db) {
  const bcrypt = require('bcryptjs');
  
  // Hash the password
  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      console.error('Error generating salt:', err);
      return;
    }
    
    bcrypt.hash('admin123', salt, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        return;
      }
      
      const adminUser = {
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@restaurant.com',
        password: hash,
        phone_number: '1234567890'
      };
      
      // Check if admin already exists
      db.query('SELECT * FROM admin WHERE email = ?', [adminUser.email], (err, results) => {
        if (err) {
          console.error('Error checking for existing admin:', err);
          return;
        }
        
        if (results.length > 0) {
          console.log('Admin user already exists');
          return;
        }
        
        // Create admin user
        db.query('INSERT INTO admin SET ?', adminUser, (err, result) => {
          if (err) {
            console.error('Error creating admin user:', err);
            return;
          }
          console.log('Default admin user created successfully');
          console.log('Email: admin@restaurant.com');
          console.log('Password: admin123');
        });
      });
    });
  });
}

module.exports = db;
