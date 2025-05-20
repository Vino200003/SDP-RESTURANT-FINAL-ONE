const db = require('../config/db');
const kitchenEmailService = require('../utils/kitchenEmailService');

/**
 * Get all orders for the kitchen dashboard with filtering by kitchen status
 */
exports.getKitchenOrders = (req, res) => {
  try {
    const { status } = req.query;
    
    let query;
    let queryParams = [];
    
    // If specific status is requested, filter by that, otherwise get Pending and Preparing by default
    if (status && status !== 'All') {
      query = `
        SELECT 
          o.*,
          u.first_name, u.last_name, u.email, u.phone_number
        FROM 
          orders o
        LEFT JOIN 
          users u ON o.user_id = u.user_id
        WHERE 
          o.kitchen_status = ?
        ORDER BY 
          o.created_at ASC
      `;
      queryParams = [status];
    } else {
      query = `
        SELECT 
          o.*,
          u.first_name, u.last_name, u.email, u.phone_number
        FROM 
          orders o
        LEFT JOIN 
          users u ON o.user_id = u.user_id
        WHERE 
          o.kitchen_status IN ('Pending', 'Preparing')
        ORDER BY 
          o.created_at ASC
      `;
    }
    
    db.query(query, queryParams, (err, results) => {
      if (err) {
        console.error('Error fetching kitchen orders:', err);
        return res.status(500).json({ 
          message: 'Error fetching kitchen orders', 
          error: err.message 
        });
      }
      
      // If no orders, return empty array
      if (results.length === 0) {
        return res.json([]);
      }
      
      // Get all order items for these orders
      const orderIds = results.map(order => order.order_id);
      
      const itemsQuery = `
        SELECT oi.*, m.menu_name, m.price AS menu_price
        FROM order_items oi
        LEFT JOIN menu m ON oi.menu_id = m.menu_id
        WHERE oi.order_id IN (?)
      `;
      
      db.query(itemsQuery, [orderIds], (err, itemsResults) => {
        if (err) {
          console.error('Error fetching order items:', err);
          // Return orders without items if there's an error
          return res.json(results);
        }
        
        // Group items by order_id
        const itemsByOrder = {};
        itemsResults.forEach(item => {
          if (!itemsByOrder[item.order_id]) {
            itemsByOrder[item.order_id] = [];
          }
          itemsByOrder[item.order_id].push({
            name: item.menu_name,
            quantity: item.quantity,
            notes: item.notes || '',
            price: parseFloat(item.price || item.menu_price)
          });
        });
        
        // Add items to each order
        const ordersWithItems = results.map(order => {
          return {
            ...order,
            items: itemsByOrder[order.order_id] || []
          };
        });
        
        res.json(ordersWithItems);
      });
    });
  } catch (error) {
    console.error('Server error in getKitchenOrders:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update the kitchen status of an order
 */
exports.updateKitchenStatus = (req, res) => {
  try {
    const orderId = req.params.id;
    const { kitchen_status } = req.body;
    
    if (!kitchen_status) {
      return res.status(400).json({ message: 'Kitchen status is required' });
    }
    
    // Validate status
    const validStatuses = ['Pending', 'Preparing', 'Ready', 'Cancelled'];
    if (!validStatuses.includes(kitchen_status)) {
      return res.status(400).json({ message: 'Invalid kitchen status value' });
    }
    
    // Update order status
    const query = `
      UPDATE orders 
      SET kitchen_status = ?, 
          updated_at = NOW()
      WHERE order_id = ?
    `;
    
    db.query(query, [kitchen_status, orderId], (err, result) => {
      if (err) {
        console.error('Error updating kitchen status:', err);
        return res.status(500).json({ 
          message: 'Error updating kitchen status', 
          error: err.message 
        });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Send email notification if order status is "Preparing"
      if (kitchen_status === 'Preparing') {
        // Get order details including user email
        db.query(
          `SELECT o.*, u.email, u.first_name 
           FROM orders o 
           LEFT JOIN users u ON o.user_id = u.user_id 
           WHERE o.order_id = ?`,
          [orderId],
          async (orderErr, orderResults) => {
            if (!orderErr && orderResults.length > 0) {
              const order = orderResults[0];
              
              // Only send email if user email is available
              if (order.email) {
                try {
                  // Create a custom email notification for Preparing status
                  const mailOptions = {
                    from: '"Restaurant Email" <vino03work@gmail.com>',
                    to: order.email,
                    subject: 'Your Order is Being Prepared',
                    html: `
                      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 5px;">
                        <h2 style="color: #4a4a4a;">Good News! Your Order is Being Prepared</h2>
                        <p>Dear ${order.first_name || 'Valued Customer'},</p>
                        <p>We're excited to let you know that our kitchen has started preparing your order!</p>
                        <p>Order Details:</p>
                        <ul>
                          <li>Order ID: ${order.order_id}</li>
                          <li>Order Type: ${order.order_type}</li>
                          <li>Total Amount: Rs. ${parseFloat(order.total_amount).toFixed(2)}</li>
                        </ul>
                        <p>We'll notify you again when your order is ready for pickup or delivery.</p>
                        <p style="margin-top: 20px;">Thank you for choosing our restaurant.</p>
                        <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
                          <p>If you have any questions, please contact us at vino03work@gmail.com or call us at (123) 456-7890.</p>
                        </div>
                      </div>
                    `
                  };                  // Send the email using the kitchen email service
                  await kitchenEmailService.sendPreparingStatusEmail(order);
                  console.log(`Kitchen status (Preparing) email sent to ${order.email}`);
                } catch (emailErr) {
                  console.error('Error sending kitchen status email:', emailErr);
                }
              }
            }
          }
        );
      }
      
      res.json({ 
        message: 'Kitchen status updated successfully',
        order_id: orderId,
        kitchen_status
      });
    });
  } catch (error) {
    console.error('Server error in updateKitchenStatus:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
