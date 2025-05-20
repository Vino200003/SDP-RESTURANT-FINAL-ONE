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
 * Send email notification for reservation status changes
 * @param {Object} reservation - The reservation object
 * @param {String} status - New status of the reservation
 */
exports.sendReservationStatusEmail = async (reservation, status) => {
  try {
    if (!reservation.email) {
      console.log('No email address provided for reservation notification');
      return;
    }

    // Define subject based on status
    let subject = 'Update on Your Restaurant Reservation';
    let message = '';
    let statusText = '';

    // Customize message based on status
    if (status === 'Confirmed') {
      statusText = 'confirmed';
      message = `
        <p>We're pleased to inform you that your reservation has been confirmed.</p>
        <p>Reservation Details:</p>
        <ul>
          <li>Reservation ID: ${reservation.reserve_id}</li>
          <li>Date & Time: ${new Date(reservation.date_time).toLocaleString()}</li>
          <li>Number of Guests: ${reservation.capacity}</li>
          <li>Table Number: ${reservation.table_no}</li>
        </ul>
        <p>We look forward to serving you!</p>
      `;
    } else if (status === 'Cancelled') {
      statusText = 'cancelled';
      message = `
        <p>We regret to inform you that your reservation has been cancelled.</p>
        <p>Reservation Details:</p>
        <ul>
          <li>Reservation ID: ${reservation.reserve_id}</li>
          <li>Date & Time: ${new Date(reservation.date_time).toLocaleString()}</li>
          <li>Number of Guests: ${reservation.capacity}</li>
        </ul>
        <p>If you did not request this cancellation, please contact us immediately.</p>
      `;
    } else {
      // For other statuses, don't send an email
      return;
    }    // Email options
    const mailOptions = {
      from: '"Restaurant Email" <vino03work@gmail.com>',
      to: reservation.email,
      subject: `Your Reservation is ${statusText}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #4a4a4a;">Your Reservation Status: ${statusText.toUpperCase()}</h2>
          <p>Dear ${reservation.customer_name || 'Valued Customer'},</p>
          ${message}
          <p style="margin-top: 20px;">Thank you for choosing our restaurant.</p>
          <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
            <p>If you have any questions, please contact us at restaurant@example.com or call us at (123) 456-7890.</p>
          </div>
        </div>
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Reservation status email sent to ${reservation.email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error sending reservation status email:', error);
  }
};

/**
 * Send email notification for order status changes
 * @param {Object} order - The order object
 * @param {String} status - New status of the order
 */
exports.sendOrderStatusEmail = async (order, status) => {
  try {
    if (!order.email) {
      console.log('No email address provided for order notification');
      return;
    }

    // Define subject based on status
    let subject = 'Update on Your Restaurant Order';
    let message = '';
    let statusText = '';

    // Customize message based on status
    if (status === 'Confirmed') {
      statusText = 'confirmed';
      message = `
        <p>We're pleased to inform you that your order has been confirmed and is being processed.</p>
        <p>Order Details:</p>
        <ul>
          <li>Order ID: ${order.order_id}</li>
          <li>Order Type: ${order.order_type}</li>
          <li>Total Amount: Rs. ${parseFloat(order.total_amount).toFixed(2)}</li>
        </ul>
        <p>We'll notify you when your order is out for delivery or ready for pickup.</p>
      `;
    } else if (status === 'Cancelled') {
      statusText = 'cancelled';
      message = `
        <p>We regret to inform you that your order has been cancelled.</p>
        <p>Order Details:</p>
        <ul>
          <li>Order ID: ${order.order_id}</li>
          <li>Order Type: ${order.order_type}</li>
          <li>Total Amount: Rs. ${parseFloat(order.total_amount).toFixed(2)}</li>
        </ul>
        <p>If you did not request this cancellation, please contact us immediately.</p>
      `;
    } else {
      // For other statuses, don't send an email
      return;
    }    // Email options
    const mailOptions = {
      from: '"Restaurant Email" <vino03work@gmail.com>',
      to: order.email,
      subject: `Your Order is ${statusText}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #4a4a4a;">Your Order Status: ${statusText.toUpperCase()}</h2>
          <p>Dear ${order.first_name || order.customer_name || 'Valued Customer'},</p>
          ${message}
          <p style="margin-top: 20px;">Thank you for choosing our restaurant.</p>
          <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
            <p>If you have any questions, please contact us at restaurant@example.com or call us at (123) 456-7890.</p>
          </div>
        </div>
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Order status email sent to ${order.email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error sending order status email:', error);
  }
};

/**
 * Send email notification for delivery status changes
 * @param {Object} order - The order object
 */
exports.sendDeliveryStatusEmail = async (order) => {
  try {
    if (!order.email) {
      console.log('No email address provided for delivery notification');
      return;
    }    // Email options
    const mailOptions = {
      from: '"Restaurant Email" <vino03work@gmail.com>',
      to: order.email,
      subject: 'Your Order is On the Way',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #4a4a4a;">Your Order is Out for Delivery</h2>
          <p>Dear ${order.first_name || order.customer_name || 'Valued Customer'},</p>
          <p>We're pleased to inform you that your order is now on its way to you!</p>
          <p>Order Details:</p>
          <ul>
            <li>Order ID: ${order.order_id}</li>
            <li>Estimated delivery time: ${order.estimated_delivery_time || 'As soon as possible'}</li>
            <li>Delivery Address: ${order.delivery_address}</li>
          </ul>
          <p>Your delivery person will contact you when they're nearby.</p>
          <p style="margin-top: 20px;">Thank you for choosing our restaurant.</p>
          <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
            <p>If you have any questions, please contact us at restaurant@example.com or call us at (123) 456-7890.</p>
          </div>
        </div>
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Delivery status email sent to ${order.email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error sending delivery status email:', error);
  }
};
