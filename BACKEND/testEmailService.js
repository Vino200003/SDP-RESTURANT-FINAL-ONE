const emailService = require('./utils/emailService');

// Test reservation confirmation email
const testReservation = {
  reserve_id: 123,
  date_time: new Date(),
  customer_name: 'Test Customer',
  email: 'test@example.com',
  capacity: 4,
  table_no: 12
};

// Test order confirmation email
const testOrder = {
  order_id: 456,
  order_type: 'Delivery',
  total_amount: 2500.50,
  first_name: 'Test',
  email: 'test@example.com'
};

// Test delivery in-transit email
const testDeliveryOrder = {
  order_id: 456,
  delivery_address: '123 Test Street, Test City',
  first_name: 'Test',
  email: 'test@example.com',
  estimated_delivery_time: '5:30 PM'
};

async function runTests() {
  console.log('Testing email service...');
  
  try {
    // Test reservation confirmation email
    console.log('Sending reservation confirmation email...');
    await emailService.sendReservationStatusEmail(testReservation, 'Confirmed');
    
    // Pause for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test reservation cancellation email
    console.log('Sending reservation cancellation email...');
    await emailService.sendReservationStatusEmail(testReservation, 'Cancelled');
    
    // Pause for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test order confirmation email
    console.log('Sending order confirmation email...');
    await emailService.sendOrderStatusEmail(testOrder, 'Confirmed');
    
    // Pause for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test order cancellation email
    console.log('Sending order cancellation email...');
    await emailService.sendOrderStatusEmail(testOrder, 'Cancelled');
    
    // Pause for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test delivery in-transit email
    console.log('Sending delivery in-transit email...');
    await emailService.sendDeliveryStatusEmail(testDeliveryOrder);
    
    console.log('All test emails sent!');
  } catch (error) {
    console.error('Error testing email service:', error);
  }
}

runTests();
