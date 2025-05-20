const kitchenEmailService = require('./utils/kitchenEmailService');

// Sample order object for testing
const testOrder = {
  order_id: 123,
  order_type: 'Delivery',
  total_amount: 2500.50,
  first_name: 'Test Customer',
  email: 'test@example.com' // Change this to a real email for testing
};

async function testKitchenEmail() {
  console.log('Testing kitchen preparing status email...');
  
  try {
    await kitchenEmailService.sendPreparingStatusEmail(testOrder);
    console.log('Email sent successfully!');
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

testKitchenEmail();
