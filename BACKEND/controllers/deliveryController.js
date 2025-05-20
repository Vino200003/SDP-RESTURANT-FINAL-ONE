const db = require('../config/db');

/**
 * Get all delivery orders with their details
 */
exports.getDeliveryOrders = (req, res) => {
  try {
    const query = `
      SELECT o.*, 
             u.first_name, u.last_name, u.email, u.phone_number,
             s.first_name AS staff_first_name, s.last_name AS staff_last_name,
             dz.gs_division, dz.delivery_fee AS zone_delivery_fee,
             dz.estimated_delivery_time_min
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      LEFT JOIN staff s ON o.delivery_person_id = s.staff_id
      LEFT JOIN delivery_zones dz ON o.zone_id = dz.zone_id
      WHERE o.order_type = 'Delivery'
      ORDER BY o.created_at DESC
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching delivery orders:', err);
        return res.status(500).json({ 
          message: 'Error fetching delivery orders', 
          error: err.message 
        });
      }
      
      // Next, get all order items for these orders
      if (results.length === 0) {
        return res.json([]);
      }
      
      const orderIds = results.map(order => order.order_id);
      
      const itemsQuery = `
        SELECT oi.*, m.menu_name, m.price AS menu_price
        FROM order_items oi
        JOIN menu m ON oi.menu_id = m.menu_id
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
            id: item.item_id,
            menu_id: item.menu_id,
            name: item.menu_name,
            quantity: item.quantity,
            price: parseFloat(item.price || item.menu_price)
          });
        });
        
        // Add items to each order
        const ordersWithItems = results.map(order => {
          // Create a properly formatted customer name
          const customerName = order.first_name || order.last_name ? 
            `${order.first_name || ''} ${order.last_name || ''}`.trim() : 
            `User ${order.user_id}`;
          
          // Create a properly formatted staff name  
          const staffName = order.staff_first_name || order.staff_last_name ? 
            `${order.staff_first_name || ''} ${order.staff_last_name || ''}`.trim() : 
            null;
          
          // Map delivery_status to expected format in frontend
          let deliveryStatus = 'pending';
          if (order.delivery_status === 'Assigned' || order.delivery_status === 'In Transit') {
            deliveryStatus = 'on_the_way';
          } else if (order.delivery_status === 'Delivered') {
            deliveryStatus = 'delivered';
          } else if (order.delivery_status === 'Canceled') {
            deliveryStatus = 'cancelled';
          }
          
          return {
            order_id: order.order_id,
            customer_name: customerName,
            delivery_address: order.delivery_address || 'No address provided',
            contact_number: order.phone_number || 'No contact number',
            order_total: parseFloat(order.total_amount),
            order_time: order.created_at,
            kitchen_status: order.kitchen_status || 'Pending', // Include kitchen_status
            delivery_status: deliveryStatus,
            assigned_to: order.delivery_person_id,
            staff_name: staffName,
            estimated_delivery: order.estimated_delivery_time,
            delivery_time: order.actual_delivery_time,
            items: itemsByOrder[order.order_id] || [],
            zone_id: order.zone_id,
            zone_name: order.gs_division,
            order_status: order.order_status,
            special_instructions: order.special_instructions,
            email: order.email
          };
        });
        
        res.json(ordersWithItems);
      });
    });
  } catch (error) {
    console.error('Server error in getDeliveryOrders:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Assign delivery person to an order
 */
exports.assignDeliveryPerson = (req, res) => {
  try {
    const { orderId, deliveryPersonId } = req.params;
    
    // Validate inputs
    if (!orderId || !deliveryPersonId) {
      return res.status(400).json({ message: 'Order ID and delivery person ID are required' });
    }
    
    // Update the order with delivery person and change status
    const query = `
      UPDATE orders 
      SET delivery_person_id = ?, 
          delivery_status = 'Assigned',
          estimated_delivery_time = DATE_ADD(NOW(), INTERVAL 
            (SELECT estimated_delivery_time_min FROM delivery_zones dz WHERE dz.zone_id = orders.zone_id) MINUTE
          ),
          updated_at = NOW()
      WHERE order_id = ? AND order_type = 'Delivery'
    `;
    
    db.query(query, [deliveryPersonId, orderId], (err, result) => {
      if (err) {
        console.error('Error assigning delivery person:', err);
        return res.status(500).json({ 
          message: 'Error assigning delivery person', 
          error: err.message 
        });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Order not found or not a delivery order' });
      }
      
      res.json({ 
        message: 'Delivery person assigned successfully',
        order_id: orderId,
        delivery_person_id: deliveryPersonId
      });
    });
  } catch (error) {
    console.error('Server error in assignDeliveryPerson:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update delivery status
 */
exports.updateDeliveryStatus = (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const emailService = require('../utils/emailService');
    
    // Validate inputs
    if (!orderId || !status) {
      return res.status(400).json({ message: 'Order ID and status are required' });
    }
    
    // Map frontend status to database enum values
    let dbStatus;
    if (status === 'on_the_way') {
      dbStatus = 'In Transit';
    } else if (status === 'delivered') {
      dbStatus = 'Delivered';
    } else if (status === 'cancelled') {
      dbStatus = 'Canceled';
    } else {
      dbStatus = 'Assigned';
    }
    
    // Additional fields to update based on status
    let additionalUpdate = '';
    const params = [dbStatus, orderId];
    
    if (dbStatus === 'Delivered') {
      additionalUpdate = ', actual_delivery_time = NOW(), order_status = "Completed"';
    } else if (dbStatus === 'Canceled') {
      additionalUpdate = ', order_status = "Cancelled"';
    }
    
    // Update the order delivery status
    const query = `
      UPDATE orders 
      SET delivery_status = ?${additionalUpdate}, 
          updated_at = NOW()
      WHERE order_id = ? AND order_type = 'Delivery'
    `;
    
    db.query(query, params, (err, result) => {
      if (err) {
        console.error('Error updating delivery status:', err);
        return res.status(500).json({ 
          message: 'Error updating delivery status', 
          error: err.message 
        });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Order not found or not a delivery order' });
      }
      
      // If status is "In Transit", send an email notification
      if (dbStatus === 'In Transit') {
        // Get the order details including user email
        const orderQuery = `
          SELECT o.*, u.email, u.first_name, u.last_name, 
                 dz.estimated_delivery_time_min
          FROM orders o
          LEFT JOIN users u ON o.user_id = u.user_id
          LEFT JOIN delivery_zones dz ON o.zone_id = dz.zone_id
          WHERE o.order_id = ?`;
          
        db.query(orderQuery, [orderId], async (orderErr, orderResults) => {
          if (!orderErr && orderResults.length > 0) {
            const order = orderResults[0];
            
            // Calculate estimated delivery time
            if (order.estimated_delivery_time_min) {
              const estimatedMinutes = order.estimated_delivery_time_min;
              const now = new Date();
              const estimated = new Date(now.getTime() + (estimatedMinutes * 60000));
              order.estimated_delivery_time = estimated.toLocaleTimeString();
            }
            
            // Send email notification
            await emailService.sendDeliveryStatusEmail(order);
          } else {
            console.error('Error fetching order details for email:', orderErr);
          }
        });
      }
      
      res.json({ 
        message: 'Delivery status updated successfully',
        order_id: orderId,
        status: dbStatus
      });
    });
  } catch (error) {
    console.error('Server error in updateDeliveryStatus:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get delivery orders assigned to a specific delivery staff
 */
exports.getStaffDeliveries = (req, res) => {
  try {
    const staffId = req.params.staffId;
    
    if (!staffId) {
      return res.status(400).json({ message: 'Staff ID is required' });
    }
    
    const query = `
      SELECT o.*, 
             u.first_name, u.last_name, u.email, u.phone_number,
             dz.gs_division, dz.delivery_fee AS zone_delivery_fee,
             dz.estimated_delivery_time_min
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      LEFT JOIN delivery_zones dz ON o.zone_id = dz.zone_id
      WHERE o.order_type = 'Delivery' AND o.delivery_person_id = ?
      ORDER BY o.created_at DESC
    `;
    
    db.query(query, [staffId], (err, results) => {
      if (err) {
        console.error('Error fetching staff deliveries:', err);
        return res.status(500).json({ 
          message: 'Error fetching staff deliveries', 
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
        JOIN menu m ON oi.menu_id = m.menu_id
        WHERE oi.order_id IN (?)
      `;
      
      db.query(itemsQuery, [orderIds], (err, itemsResults) => {
        if (err) {
          console.error('Error fetching order items:', err);
          // Return orders without items if there's an error
          return res.json(transformDeliveryOrders(results, {}));
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
            price: parseFloat(item.price || item.menu_price)
          });
        });
        
        // Transform the data to match the expected format in the frontend
        const deliveries = transformDeliveryOrders(results, itemsByOrder);
        res.json(deliveries);
      });
    });
  } catch (error) {
    console.error('Server error in getStaffDeliveries:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper function to transform order data to the format expected by the frontend
function transformDeliveryOrders(orders, itemsByOrder) {
  return orders.map(order => {
    // Create a delivery ID using the order_id with a DEL prefix
    const deliveryId = `DEL-${order.order_id.toString().padStart(3, '0')}`;
    
    // Map status from database to frontend
    let status;
    if (order.delivery_status === 'Pending' || order.delivery_status === 'Assigned') {
      status = 'Assigned';
    } else if (order.delivery_status === 'In Transit') {
      status = 'In Transit';
    } else if (order.delivery_status === 'Delivered') {
      status = 'Delivered';
    } else if (order.delivery_status === 'Canceled') {
      status = 'Canceled';
    } else {
      status = 'Assigned'; // Default status
    }
    
    // Format customer name
    const customerName = order.first_name || order.last_name ? 
      `${order.first_name || ''} ${order.last_name || ''}`.trim() : 
      `Customer #${order.user_id}`;
    
    return {
      id: deliveryId,
      orderId: `ORD-${order.order_id}`,
      customer: {
        name: customerName,
        address: order.delivery_address || 'Address not provided',
        phone: order.phone_number || 'Phone not provided'
      },
      items: itemsByOrder[order.order_id] || [],
      status: status,
      timestamp: order.created_at,
      estimatedDeliveryTime: order.estimated_delivery_time_min ? 
        `${order.estimated_delivery_time_min} min` : 
        '30-45 min',
      totalAmount: `LKR ${parseFloat(order.total_amount).toFixed(2)}`,
      payment: {
        method: order.payment_type === 'cash' ? 'Cash' : 'Card',
        status: order.payment_status === 'paid' ? 'Paid' : 'Pending'
      }
    };
  });
}
