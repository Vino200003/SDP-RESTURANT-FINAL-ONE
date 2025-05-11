const db = require('../config/db');

// Get all orders with pagination and filtering
exports.getAllOrders = (req, res) => {
  const { status, type, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT o.*, u.user_id, s.staff_id 
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.user_id
    LEFT JOIN staff s ON o.delivery_person_id = s.staff_id
    WHERE 1=1
  `;
  let params = [];
  
  if (status) {
    query += ' AND o.order_status = ?';
    params.push(status);
  }
  
  if (type) {
    query += ' AND o.order_type = ?';
    params.push(type);
  }
  
  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching orders:', err);
      return res.status(500).json({ 
        message: 'Error fetching orders', 
        error: err.message 
      });
    }
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total FROM orders o
      WHERE 1=1 ${status ? ' AND o.order_status = ?' : ''} ${type ? ' AND o.order_type = ?' : ''}
    `;
    const countParams = [];
    if (status) countParams.push(status);
    if (type) countParams.push(type);
    
    db.query(countQuery, countParams, (countErr, countResults) => {
      if (countErr) {
        console.error('Error counting orders:', countErr);
        return res.status(500).json({ 
          message: 'Error counting orders', 
          error: countErr.message 
        });
      }
      
      res.json({
        orders: results,
        pagination: {
          total: countResults[0].total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(countResults[0].total / limit)
        }
      });
    });
  });
};

// Get order by ID with its items
exports.getOrderById = (req, res) => {
  const orderId = req.params.id;
  
  // Get order details
  const orderQuery = `
    SELECT o.*, u.user_id, u.email, u.phone_number, s.staff_id 
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.user_id
    LEFT JOIN staff s ON o.delivery_person_id = s.staff_id
    WHERE o.order_id = ?
  `;
  
  // Get order items
  const itemsQuery = `
    SELECT oi.*, m.menu_name
    FROM order_items oi
    JOIN menu m ON oi.menu_id = m.menu_id
    WHERE oi.order_id = ?
  `;
  
  db.query(orderQuery, [orderId], (err, orderResults) => {
    if (err) {
      console.error('Error fetching order:', err);
      return res.status(500).json({ 
        message: 'Error fetching order', 
        error: err.message 
      });
    }
    
    if (orderResults.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    db.query(itemsQuery, [orderId], (itemsErr, itemsResults) => {
      if (itemsErr) {
        console.error('Error fetching order items:', itemsErr);
        return res.status(500).json({ 
          message: 'Error fetching order items', 
          error: itemsErr.message 
        });
      }
      
      const order = orderResults[0];
      order.items = itemsResults;
      
      res.json(order);
    });
  });
};

// Create a new order
exports.createOrder = (req, res) => {
  const { 
    user_id, 
    order_type, 
    items, 
    delivery_person_id = null, 
    delivery_address = null,
    zone_id = null,  // Add zone_id parameter
    delivery_notes = '',
    special_instructions = '',
    subtotal,
    service_fee,
    delivery_fee,
    total_amount,
    payment_method
  } = req.body;
  
  if (!user_id || !order_type || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Invalid order data. Required fields: user_id, order_type, items (array)' });
  }
  
  // Validate delivery address for delivery orders
  if (order_type === 'Delivery' && !delivery_address) {
    return res.status(400).json({ message: 'Delivery address is required for delivery orders' });
  }
  
  // Extract menu IDs to validate
  const menuIds = items.map(item => item.menu_id);
  
  // Begin transaction
  db.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ 
        message: 'Error creating order', 
        error: err.message 
      });
    }
    
    // First validate that all menu items exist
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
      
      // Calculate total amount if not provided
      let calculatedTotal = total_amount;
      if (!calculatedTotal) {
        calculatedTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      }
      
      // Create order - include all the new fields
      const orderData = {
        user_id,
        order_type,
        order_status: 'Pending',
        sub_total: subtotal || calculatedTotal,
        service_fee: service_fee || 0,
        delivery_fee: delivery_fee || 0,
        total_amount: calculatedTotal,
        delivery_person_id: delivery_person_id,
        delivery_address: order_type === 'Delivery' ? delivery_address : '',
        zone_id: order_type === 'Delivery' ? zone_id : null,  // Add zone_id
        special_instructions: special_instructions || delivery_notes || '',
        payment_type: payment_method || 'cash',
        payment_status: 'unpaid'
      };
      
      console.log('Creating order with data:', orderData);
      
      db.query('INSERT INTO orders SET ?', orderData, (orderErr, orderResult) => {
        if (orderErr) {
          return db.rollback(() => {
            console.error('Error creating order:', orderErr);
            res.status(500).json({ 
              message: 'Error creating order', 
              error: orderErr.message 
            });
          });
        }
        
        const order_id = orderResult.insertId;
        
        // Insert order items
        const orderItems = items.map(item => [
          order_id,
          item.menu_id,
          item.quantity,
          item.price
        ]);
        
        const itemsQuery = 'INSERT INTO order_items (order_id, menu_id, quantity, price) VALUES ?';
        
        db.query(itemsQuery, [orderItems], (itemsErr) => {
          if (itemsErr) {
            return db.rollback(() => {
              console.error('Error adding order items:', itemsErr);
              res.status(500).json({ 
                message: 'Error adding order items', 
                error: itemsErr.message 
              });
            });
          }
          
          // Commit transaction
          db.commit(commitErr => {
            if (commitErr) {
              return db.rollback(() => {
                console.error('Error committing transaction:', commitErr);
                res.status(500).json({ 
                  message: 'Error creating order', 
                  error: commitErr.message 
                });
              });
            }
            
            res.status(201).json({
              message: 'Order created successfully',
              order_id,
              total_amount: calculatedTotal
            });
          });
        });
      });
    });
  });
};

// Update order status
exports.updateOrderStatus = (req, res) => {
  const orderId = req.params.id;
  const { order_status, delivery_person_id } = req.body;
  
  if (!order_status) {
    return res.status(400).json({ message: 'Order status is required' });
  }
  
  const updateData = { order_status };
  
  // Add delivery person if provided
  if (delivery_person_id) {
    updateData.delivery_person_id = delivery_person_id;
  }
  
  db.query('UPDATE orders SET ? WHERE order_id = ?', [updateData, orderId], (err, result) => {
    if (err) {
      console.error('Error updating order status:', err);
      return res.status(500).json({ 
        message: 'Error updating order status', 
        error: err.message 
      });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json({
      message: 'Order status updated successfully',
      order_id: orderId,
      order_status
    });
  });
};

// Update an existing order
exports.updateOrder = (req, res) => {
  const orderId = req.params.id;
  const { 
    user_id, 
    order_type, 
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
};

// Delete an order
exports.deleteOrder = (req, res) => {
  const orderId = req.params.id;
  
  // Begin transaction
  db.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ 
        message: 'Error deleting order', 
        error: err.message 
      });
    }
    
    // Delete order items first (though they would be deleted by CASCADE)
    db.query('DELETE FROM order_items WHERE order_id = ?', [orderId], (itemsErr) => {
      if (itemsErr) {
        return db.rollback(() => {
          console.error('Error deleting order items:', itemsErr);
          res.status(500).json({ 
            message: 'Error deleting order items', 
            error: itemsErr.message 
          });
        });
      }
      
      // Delete the order
      db.query('DELETE FROM orders WHERE order_id = ?', [orderId], (orderErr, result) => {
        if (orderErr) {
          return db.rollback(() => {
            console.error('Error deleting order:', orderErr);
            res.status(500).json({ 
              message: 'Error deleting order', 
              error: orderErr.message 
            });
          });
        }
        
        if (result.affectedRows === 0) {
          return db.rollback(() => {
            res.status(404).json({ message: 'Order not found' });
          });
        }
        
        // Commit transaction
        db.commit(commitErr => {
          if (commitErr) {
            return db.rollback(() => {
              console.error('Error committing transaction:', commitErr);
              res.status(500).json({ 
                message: 'Error deleting order', 
                error: commitErr.message 
              });
            });
          }
          
          res.json({ message: 'Order deleted successfully' });
        });
      });
    });
  });
};

// Cancel an order
exports.cancelOrder = (req, res) => {
  const orderId = req.params.id;
  const { cancellation_reason } = req.body;
  
  // First check if order exists and can be cancelled
  db.query('SELECT * FROM orders WHERE order_id = ?', [orderId], (err, results) => {
    if (err) {
      console.error('Error fetching order:', err);
      return res.status(500).json({ 
        message: 'Error fetching order', 
        error: err.message 
      });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = results[0];
    
    // Only allow cancelling orders that are in Pending or In Progress status
    const cancellableStatuses = ['Pending', 'In Progress'];
    if (!cancellableStatuses.includes(order.order_status)) {
      return res.status(400).json({ 
        message: `Cannot cancel order in ${order.order_status} status. Only orders in ${cancellableStatuses.join(' or ')} status can be cancelled.` 
      });
    }
    
    // Update order status to 'Cancelled'
    const updateData = { 
      order_status: 'Cancelled', 
      updated_at: new Date()
    };
    
    // Add cancellation reason if provided
    if (cancellation_reason) {
      updateData.cancellation_reason = cancellation_reason;
    }
    
    db.query('UPDATE orders SET ? WHERE order_id = ?', [updateData, orderId], (updateErr, result) => {
      if (updateErr) {
        console.error('Error cancelling order:', updateErr);
        return res.status(500).json({ 
          message: 'Error cancelling order', 
          error: updateErr.message 
        });
      }
      
      res.json({
        message: 'Order cancelled successfully',
        order_id: orderId
      });
    });
  });
};

// Get order statistics
exports.getOrderStats = (req, res) => {
  const { start_date, end_date } = req.query;
  
  let dateFilter = '';
  let params = [];
  
  if (start_date && end_date) {
    dateFilter = 'WHERE created_at BETWEEN ? AND ?';
    params = [start_date, end_date];
  }
  
  const query = `
    SELECT 
      COUNT(*) as total_orders,
      SUM(total_amount) as total_revenue,
      COUNT(CASE WHEN order_status = 'Completed' THEN 1 END) as completed_orders,
      COUNT(CASE WHEN order_status = 'Cancelled' THEN 1 END) as cancelled_orders,
      COUNT(CASE WHEN order_status = 'Pending' THEN 1 END) as pending_orders,
      COUNT(CASE WHEN order_status = 'In Progress' THEN 1 END) as in_progress_orders,
      COUNT(CASE WHEN order_type = 'Dine-in' THEN 1 END) as dine_in_orders,
      COUNT(CASE WHEN order_type = 'Takeaway' THEN 1 END) as takeaway_orders,
      COUNT(CASE WHEN order_type = 'Delivery' THEN 1 END) as delivery_orders
    FROM orders
    ${dateFilter}
  `;
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching order statistics:', err);
      return res.status(500).json({ 
        message: 'Error fetching order statistics', 
        error: err.message 
      });
    }
    
    res.json(results[0]);
  });
};
