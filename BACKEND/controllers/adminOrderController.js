const db = require('../config/db');

// Get all orders with pagination and filters
exports.getAllOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      type,
      kitchenStatus, // Add kitchen status
      startDate, 
      endDate
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build WHERE clause for filters
    let whereClause = '';
    const queryParams = [];
    
    if (status) {
      whereClause += 'WHERE order_status = ?';
      queryParams.push(status);
    }
    
    if (type) {
      whereClause += whereClause ? ' AND order_type = ?' : 'WHERE order_type = ?';
      queryParams.push(type);
    }
    
    if (kitchenStatus) {
      whereClause += whereClause ? ' AND kitchen_status = ?' : 'WHERE kitchen_status = ?';
      queryParams.push(kitchenStatus);
    }
    
    if (startDate) {
      whereClause += whereClause ? ' AND created_at >= ?' : 'WHERE created_at >= ?';
      queryParams.push(startDate);
    }
    
    if (endDate) {
      whereClause += whereClause ? ' AND created_at <= ?' : 'WHERE created_at <= ?';
      queryParams.push(endDate);
    }
    
    // Check if orders table exists
    db.query('SHOW TABLES LIKE "orders"', (err, tables) => {
      if (err) {
        console.error('Error checking for orders table:', err);
        return res.status(500).json({ message: 'Database error', error: err.message });
      }
      
      if (tables.length === 0) {
        // Return empty data if table doesn't exist yet
        return res.json({
          orders: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      }
      
      // Get total count for pagination
      const countQuery = `SELECT COUNT(*) as total FROM orders ${whereClause}`;
      
      db.query(countQuery, queryParams, (err, countResult) => {
        if (err) {
          console.error('Error counting orders:', err);
          return res.status(500).json({ message: 'Error fetching orders', error: err.message });
        }
        
        const total = countResult[0].total;
        const pages = Math.ceil(total / limit);
        
        // Query for orders with pagination
        const queryParams2 = [...queryParams];
        queryParams2.push(parseInt(limit));
        queryParams2.push(offset);
        
        const query = `
          SELECT o.*, u.first_name, u.last_name, u.email, u.phone_number
          FROM orders o
          LEFT JOIN users u ON o.user_id = u.user_id
          ${whereClause}
          ORDER BY o.created_at DESC
          LIMIT ? OFFSET ?
        `;
        
        db.query(query, queryParams2, (err, orders) => {
          if (err) {
            console.error('Error fetching orders:', err);
            return res.status(500).json({ message: 'Error fetching orders', error: err.message });
          }
          
          // For each order, get its items
          if (orders.length > 0) {
            const orderIds = orders.map(order => order.order_id);
            const itemsQuery = `
              SELECT oi.*, m.menu_name
              FROM order_items oi
              LEFT JOIN menu m ON oi.menu_id = m.menu_id
              WHERE oi.order_id IN (?)
            `;
            
            db.query(itemsQuery, [orderIds], (err, allItems) => {
              if (err) {
                console.error('Error fetching order items:', err);
                // Continue without items if there's an error
              } else {
                // Group items by order_id
                const itemsByOrder = {};
                allItems.forEach(item => {
                  if (!itemsByOrder[item.order_id]) {
                    itemsByOrder[item.order_id] = [];
                  }
                  itemsByOrder[item.order_id].push(item);
                });
                
                // Add items to each order
                orders.forEach(order => {
                  order.items = itemsByOrder[order.order_id] || [];
                });
              }
              
              // Send response with pagination info
              res.json({
                orders,
                pagination: {
                  page: parseInt(page),
                  limit: parseInt(limit),
                  total,
                  pages
                }
              });
            });
          } else {
            // No orders, return empty result
            res.json({
              orders: [],
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages
              }
            });
          }
        });
      });
    });
  } catch (error) {
    console.error('Server error in getAllOrders:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get order statistics
exports.getOrderStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build WHERE clause for date filters
    let whereClause = '';
    const queryParams = [];
    
    if (startDate) {
      whereClause += 'WHERE created_at >= ?';
      queryParams.push(startDate);
    }
    
    if (endDate) {
      whereClause += whereClause ? ' AND created_at <= ?' : 'WHERE created_at <= ?';
      queryParams.push(endDate);
    }
    
    // Check if orders table exists
    db.query('SHOW TABLES LIKE "orders"', (err, tables) => {
      if (err) {
        console.error('Error checking for orders table:', err);
        return res.status(500).json({ message: 'Database error', error: err.message });
      }
      
      if (tables.length === 0) {
        // Return empty stats if table doesn't exist yet
        return res.json({
          total_orders: 0,
          total_revenue: 0,
          pending_orders: 0,
          completed_orders: 0,
          cancelled_orders: 0,
          in_progress_orders: 0
        });
      }
      
      // Query for order stats
      const statsQuery = `
        SELECT
          COUNT(*) as total_orders,
          SUM(total_amount) as total_revenue,
          SUM(CASE WHEN order_status = 'Pending' THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN order_status = 'Completed' THEN 1 ELSE 0 END) as completed_orders,
          SUM(CASE WHEN order_status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
          SUM(CASE WHEN order_status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_orders
        FROM orders
        ${whereClause}
      `;
      
      db.query(statsQuery, queryParams, (err, results) => {
        if (err) {
          console.error('Error fetching order stats:', err);
          return res.status(500).json({ message: 'Error fetching order stats', error: err.message });
        }
        
        // Convert results to appropriate format
        const stats = results[0];
        
        // Ensure values are numbers, not null
        const formatStats = {
          total_orders: parseInt(stats.total_orders || 0),
          total_revenue: parseFloat(stats.total_revenue || 0).toFixed(2),
          pending_orders: parseInt(stats.pending_orders || 0),
          completed_orders: parseInt(stats.completed_orders || 0),
          cancelled_orders: parseInt(stats.cancelled_orders || 0),
          in_progress_orders: parseInt(stats.in_progress_orders || 0)
        };
        
        res.json(formatStats);
      });
    });
  } catch (error) {
    console.error('Server error in getOrderStats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get order by ID with details
exports.getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;
    
    const query = `
      SELECT o.*, u.first_name, u.last_name, u.email, u.phone_number
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      WHERE o.order_id = ?
    `;
    
    db.query(query, [orderId], (err, results) => {
      if (err) {
        console.error('Error fetching order:', err);
        return res.status(500).json({ message: 'Error fetching order', error: err.message });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      const order = results[0];
      
      // Get order items
      const itemsQuery = `
        SELECT oi.*, m.menu_name
        FROM order_items oi
        LEFT JOIN menu m ON oi.menu_id = m.menu_id
        WHERE oi.order_id = ?
      `;
      
      db.query(itemsQuery, [orderId], (err, items) => {
        if (err) {
          console.error('Error fetching order items:', err);
          return res.status(500).json({ message: 'Error fetching order items', error: err.message });
        }
        
        order.items = items;
        
        res.json(order);
      });
    });
  } catch (error) {
    console.error('Server error in getOrderById:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    const emailService = require('../utils/emailService');
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    // Validate status
    const validStatuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    db.query('UPDATE orders SET order_status = ?, updated_at = NOW() WHERE order_id = ?', 
      [status, orderId], 
      (err, result) => {
        if (err) {
          console.error('Error updating order status:', err);
          return res.status(500).json({ message: 'Error updating order status', error: err.message });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Order not found' });
        }
        
        // Send email notification if status is Confirmed or Cancelled
        if (['Confirmed', 'Cancelled'].includes(status)) {
          // Get the order details including user information
          db.query(`
            SELECT o.*, u.email, u.first_name, u.last_name 
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.user_id
            WHERE o.order_id = ?`, 
            [orderId], 
            async (orderErr, orderResults) => {
              if (!orderErr && orderResults.length > 0) {
                const order = orderResults[0];
                // Send email notification
                await emailService.sendOrderStatusEmail(order, status);
              } else {
                console.error('Error fetching order details for email:', orderErr);
              }
          });
        }
        
        res.json({ message: 'Order status updated successfully' });
      }
    );
  } catch (error) {
    console.error('Server error in updateOrderStatus:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update an order
exports.updateOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { 
      user_id, 
      order_type, 
      order_status,
      items, 
      delivery_person_id, 
      delivery_address,
      special_instructions,
      payment_method,
      payment_status 
    } = req.body;
    
    // Begin transaction
    db.beginTransaction(err => {
      if (err) {
        console.error('Error starting transaction:', err);
        return res.status(500).json({ 
          message: 'Error updating order', 
          error: err.message 
        });
      }
      
      // First check if order exists
      db.query('SELECT * FROM orders WHERE order_id = ?', [orderId], (orderErr, orderResults) => {
        if (orderErr) {
          return db.rollback(() => {
            console.error('Error checking order existence:', orderErr);
            res.status(500).json({ 
              message: 'Error checking order existence', 
              error: orderErr.message 
            });
          });
        }
        
        if (orderResults.length === 0) {
          return db.rollback(() => {
            res.status(404).json({ message: 'Order not found' });
          });
        }
        
        const currentOrder = orderResults[0];
        
        // Validate delivery address for delivery orders
        if (order_type === 'Delivery' && !delivery_address && !currentOrder.delivery_address) {
          return db.rollback(() => {
            res.status(400).json({ message: 'Delivery address is required for delivery orders' });
          });
        }
        
        // Build update object with only provided fields
        const updateData = {};
        if (user_id) updateData.user_id = user_id;
        if (order_type) updateData.order_type = order_type;
        if (order_status) updateData.order_status = order_status;
        if (delivery_person_id !== undefined) updateData.delivery_person_id = delivery_person_id;
        if (delivery_address !== undefined) updateData.delivery_address = delivery_address;
        if (special_instructions !== undefined) updateData.special_instructions = special_instructions;
        if (payment_method) updateData.payment_method = payment_method;
        if (payment_status) updateData.payment_status = payment_status;
        
        // Add updated_at timestamp
        updateData.updated_at = new Date();
        
        // If items are provided, recalculate total amount
        let total_amount = currentOrder.total_amount;
        if (items && Array.isArray(items) && items.length > 0) {
          // Extract menu IDs to validate
          const menuIds = items.map(item => item.menu_id);
          
          // Validate all menu items exist
          const menuValidationQuery = 'SELECT menu_id FROM menu WHERE menu_id IN (?)';
          db.query(menuValidationQuery, [menuIds], (validationErr, validationResults) => {
            if (validationErr) {
              return db.rollback(() => {
                console.error('Error validating menu items:', validationErr);
                res.status(500).json({ 
                  message: 'Error validating menu items', 
                  error: validationErr.message 
                });
              });
            }
            
            // Check if all menu items exist
            const foundMenuIds = validationResults.map(item => item.menu_id);
            const missingMenuIds = menuIds.filter(id => !foundMenuIds.includes(id));
            
            if (missingMenuIds.length > 0) {
              return db.rollback(() => {
                res.status(400).json({ 
                  message: 'Some menu items do not exist', 
                  missingMenuIds 
                });
              });
            }
            
            // Calculate total amount
            total_amount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            updateData.total_amount = total_amount;
            
            // Update the order first
            updateOrderAndItems();
          });
        } else {
          // Update the order without touching items
          updateOrderAndItems();
        }
        
        function updateOrderAndItems() {
          // Only proceed with update if there are fields to update
          if (Object.keys(updateData).length === 0) {
            return db.rollback(() => {
              res.status(400).json({ message: 'No update data provided' });
            });
          }
          
          // Update order
          db.query('UPDATE orders SET ? WHERE order_id = ?', [updateData, orderId], (updateErr, updateResult) => {
            if (updateErr) {
              return db.rollback(() => {
                console.error('Error updating order:', updateErr);
                res.status(500).json({ 
                  message: 'Error updating order', 
                  error: updateErr.message 
                });
              });
            }
            
            // If items are provided, update them
            if (items && Array.isArray(items) && items.length > 0) {
              // First delete existing items
              db.query('DELETE FROM order_items WHERE order_id = ?', [orderId], (deleteErr) => {
                if (deleteErr) {
                  return db.rollback(() => {
                    console.error('Error deleting existing order items:', deleteErr);
                    res.status(500).json({ 
                      message: 'Error updating order items', 
                      error: deleteErr.message 
                    });
                  });
                }
                
                // Then insert new items
                const orderItems = items.map(item => [
                  orderId,
                  item.menu_id,
                  item.quantity,
                  item.price
                ]);
                
                const itemsQuery = 'INSERT INTO order_items (order_id, menu_id, quantity, price) VALUES ?';
                
                db.query(itemsQuery, [orderItems], (insertErr) => {
                  if (insertErr) {
                    return db.rollback(() => {
                      console.error('Error inserting updated order items:', insertErr);
                      res.status(500).json({ 
                        message: 'Error updating order items', 
                        error: insertErr.message 
                      });
                    });
                  }
                  
                  // Commit transaction
                  commitTransaction();
                });
              });
            } else {
              // No items to update, commit transaction
              commitTransaction();
            }
          });
        }
        
        function commitTransaction() {
          db.commit(commitErr => {
            if (commitErr) {
              return db.rollback(() => {
                console.error('Error committing transaction:', commitErr);
                res.status(500).json({ 
                  message: 'Error updating order', 
                  error: commitErr.message 
                });
              });
            }
            
            res.json({
              message: 'Order updated successfully',
              order_id: orderId
            });
          });
        }
      });
    });
  } catch (error) {
    console.error('Server error in updateOrder:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
