const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vino03work@gmail.com', // Restaurant Email
    pass: 'psci fknz ikfu qwke' // App password
  }
});

/**
 * Send email notification for kitchen preparation status
 * @param {Object} order - The order object
 */
exports.sendPreparingStatusEmail = async (order) => {
  try {
    if (!order.email) {
      console.log('No email address provided for kitchen status notification');
      return;
    }

    // Email options
    const mailOptions = {
      from: '"Restaurant Email" <vino03work@gmail.com>',
      to: order.email,
      subject: 'Your Order is Being Prepared',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #4a4a4a;">Good News! Your Order is Being Prepared</h2>
          <p>Dear ${order.first_name || order.customer_name || 'Valued Customer'},</p>
          <p>We're excited to let you know that our kitchen has started preparing your order!</p>
          <p>Order Details:</p>
          <ul>
            <li>Order ID: ${order.order_id}</li>
            <li>Order Type: ${order.order_type || 'Standard'}</li>
            <li>Total Amount: Rs. ${parseFloat(order.total_amount).toFixed(2)}</li>
          </ul>
          <p>We'll notify you again when your order is ready for pickup or delivery.</p>
          <p style="margin-top: 20px;">Thank you for choosing our restaurant.</p>
          <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
            <p>If you have any questions, please contact us at vino03work@gmail.com or call us at (123) 456-7890.</p>
          </div>
        </div>
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Kitchen preparing status email sent to ${order.email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error sending kitchen preparing status email:', error);
  }
};
