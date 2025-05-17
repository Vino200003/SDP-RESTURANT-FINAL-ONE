// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const app = require('./app');  // Import app.js for routing and middleware

const port = process.env.PORT || 5000;

// Import routes
const userRoutes = require('./routes/userRoutes');
const menuRoutes = require('./routes/menuRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Make sure this is added
const deliveryZoneRoutes = require('./routes/deliveryZoneRoutes'); // Import the delivery zone routes
const deliveryRoutes = require('./routes/deliveryRoutes'); // Import the delivery routes
const staffRoutes = require('./routes/staffRoutes'); // Ensure this is imported
const kitchenRoutes = require('./routes/kitchenRoutes'); // Import the kitchen routes
const staffProfileRoutes = require('./routes/staffProfileRoutes'); // Import staff profile routes
const reportRoutes = require('./routes/reportRoutes'); // Import report routes

// Apply middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/admin', adminRoutes); // Make sure this is added
app.use('/api/delivery-zones', deliveryZoneRoutes); // Add the delivery zone routes to the express app
app.use('/api/delivery', deliveryRoutes); // Add the delivery routes to the express app
app.use('/api/staff', staffRoutes); // Make sure this is registered
app.use('/api/kitchen', kitchenRoutes); // Kitchen routes
app.use('/api/staff/profile', staffProfileRoutes); // Use staff profile routes
app.use('/api/admin/reports', reportRoutes); // Use report routes

console.log('User routes initialized');
console.log('Menu routes initialized');
console.log('Reservation routes initialized');
console.log('Admin routes initialized'); // Add this log
console.log('Delivery zone routes initialized'); // Add this log
console.log('Delivery routes initialized'); // Add this log
console.log('Report routes initialized'); // Log for report routes

// Add more detailed logging for server startup
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`API can be accessed at http://localhost:${port}/api`);
  console.log(`Test the API with: http://localhost:${port}/api/users/test`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});
