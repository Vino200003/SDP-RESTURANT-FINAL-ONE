const mysql = require('mysql2/promise');

// Database connection configuration - adjust as needed to match your settings
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'Restaurant_system'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test the connection
pool.getConnection()
  .then(connection => {
    console.log('Database connection established successfully.');
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to database:', err.message);
  });

// Function to get a connection from the pool
const getConnection = async () => {
  return await pool.getConnection();
};

// Export the pool and getConnection function
module.exports = {
  query: pool.query.bind(pool),
  execute: pool.execute.bind(pool),
  getConnection
};
