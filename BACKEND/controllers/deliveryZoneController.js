const db = require('../config/db');

/**
 * Get all active delivery zones
 */
exports.getAllDeliveryZones = (req, res) => {
  try {
    const includeInactive = req.query.all === 'true';
    
    const query = `
      SELECT 
        zone_id as id, 
        gs_division as name, 
        delivery_fee, 
        estimated_delivery_time_min as estimated_time,
        is_active as active,
        created_at,
        updated_at,
        (SELECT COUNT(*) FROM orders WHERE zone_id = delivery_zones.zone_id AND 
         delivery_status IN ('Pending', 'Assigned', 'In Transit')) as active_orders
      FROM delivery_zones
      ${includeInactive ? '' : 'WHERE is_active = TRUE'}
      ORDER BY gs_division ASC
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching delivery zones:', err);
        return res.status(500).json({ 
          message: 'Error fetching delivery zones', 
          error: err.message 
        });
      }
      
      // Transform boolean is_active to string status for frontend
      const formattedResults = results.map(zone => ({
        ...zone,
        status: zone.active ? 'active' : 'inactive',
        description: `Delivery zone for ${zone.name} area` // Default description
      }));
      
      res.json(formattedResults);
    });
  } catch (error) {
    console.error('Server error in getAllDeliveryZones:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get delivery zone by ID
 */
exports.getDeliveryZoneById = (req, res) => {
  try {
    const zoneId = req.params.id;
    
    const query = `
      SELECT 
        zone_id as id, 
        gs_division as name, 
        delivery_fee, 
        estimated_delivery_time_min as estimated_time,
        is_active as active,
        created_at,
        updated_at
      FROM delivery_zones
      WHERE zone_id = ?
    `;
    
    db.query(query, [zoneId], (err, results) => {
      if (err) {
        console.error('Error fetching delivery zone:', err);
        return res.status(500).json({ 
          message: 'Error fetching delivery zone', 
          error: err.message 
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'Delivery zone not found' });
      }
      
      // Transform boolean is_active to string status for frontend
      const zone = {
        ...results[0],
        status: results[0].active ? 'active' : 'inactive',
        description: `Delivery zone for ${results[0].name} area` // Default description
      };
      
      res.json(zone);
    });
  } catch (error) {
    console.error('Server error in getDeliveryZoneById:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get delivery fee by zone ID
 */
exports.getDeliveryFeeByZoneId = (req, res) => {
  try {
    const zoneId = req.params.id;
    
    const query = `
      SELECT delivery_fee
      FROM delivery_zones
      WHERE zone_id = ? AND is_active = TRUE
    `;
    
    db.query(query, [zoneId], (err, results) => {
      if (err) {
        console.error('Error fetching delivery fee:', err);
        return res.status(500).json({ 
          message: 'Error fetching delivery fee', 
          error: err.message 
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'Delivery zone not found' });
      }
      
      res.json({ delivery_fee: results[0].delivery_fee });
    });
  } catch (error) {
    console.error('Server error in getDeliveryFeeByZoneId:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Create a new delivery zone
 */
exports.createDeliveryZone = (req, res) => {
  try {
    const { name, delivery_fee, estimated_time, status } = req.body;
    
    // Validate required fields
    if (!name || delivery_fee === undefined || estimated_time === undefined) {
      return res.status(400).json({ 
        message: 'Please provide name, delivery fee, and estimated delivery time' 
      });
    }
    
    const zone = {
      gs_division: name,
      delivery_fee: parseFloat(delivery_fee),
      estimated_delivery_time_min: parseInt(estimated_time),
      is_active: status === 'active'
    };
    
    const query = `INSERT INTO delivery_zones SET ?`;
    
    db.query(query, zone, (err, result) => {
      if (err) {
        // Handle duplicate key error
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'A zone with this name already exists' });
        }
        
        console.error('Error creating delivery zone:', err);
        return res.status(500).json({ 
          message: 'Error creating delivery zone', 
          error: err.message 
        });
      }
      
      const newZoneId = result.insertId;
      
      // Return the created zone
      const createdZone = {
        id: newZoneId,
        name,
        delivery_fee: parseFloat(delivery_fee),
        estimated_time: parseInt(estimated_time),
        status,
        active_orders: 0
      };
      
      res.status(201).json({
        message: 'Delivery zone created successfully',
        zone: createdZone
      });
    });
  } catch (error) {
    console.error('Server error in createDeliveryZone:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update an existing delivery zone
 */
exports.updateDeliveryZone = (req, res) => {
  try {
    const zoneId = req.params.id;
    const { name, delivery_fee, estimated_time, status } = req.body;
    
    // Validate required fields
    if (!name || delivery_fee === undefined || estimated_time === undefined || !status) {
      return res.status(400).json({ 
        message: 'Please provide name, delivery fee, estimated delivery time, and status' 
      });
    }
    
    const updatedZone = {
      gs_division: name,
      delivery_fee: parseFloat(delivery_fee),
      estimated_delivery_time_min: parseInt(estimated_time),
      is_active: status === 'active'
    };
    
    const query = `UPDATE delivery_zones SET ? WHERE zone_id = ?`;
    
    db.query(query, [updatedZone, zoneId], (err, result) => {
      if (err) {
        // Handle duplicate key error
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'A zone with this name already exists' });
        }
        
        console.error('Error updating delivery zone:', err);
        return res.status(500).json({ 
          message: 'Error updating delivery zone', 
          error: err.message 
        });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Delivery zone not found' });
      }
      
      res.json({
        message: 'Delivery zone updated successfully',
        zone: {
          id: parseInt(zoneId),
          ...updatedZone,
          status: updatedZone.is_active ? 'active' : 'inactive'
        }
      });
    });
  } catch (error) {
    console.error('Server error in updateDeliveryZone:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Delete a delivery zone
 */
exports.deleteDeliveryZone = (req, res) => {
  try {
    const zoneId = req.params.id;
    
    // First check if zone has any active orders
    const checkOrdersQuery = `
      SELECT COUNT(*) as orderCount 
      FROM orders 
      WHERE zone_id = ? AND delivery_status IN ('Pending', 'Assigned', 'In Transit')
    `;
    
    db.query(checkOrdersQuery, [zoneId], (err, results) => {
      if (err) {
        console.error('Error checking for active orders:', err);
        return res.status(500).json({ 
          message: 'Error checking for active orders', 
          error: err.message 
        });
      }
      
      const activeOrders = results[0].orderCount;
      
      if (activeOrders > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete: This zone has active delivery orders' 
        });
      }
      
      // If no active orders, proceed with deletion
      const deleteQuery = `DELETE FROM delivery_zones WHERE zone_id = ?`;
      
      db.query(deleteQuery, [zoneId], (err, result) => {
        if (err) {
          console.error('Error deleting delivery zone:', err);
          return res.status(500).json({ 
            message: 'Error deleting delivery zone', 
            error: err.message 
          });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Delivery zone not found' });
        }
        
        res.json({ 
          message: 'Delivery zone deleted successfully',
          id: parseInt(zoneId)
        });
      });
    });
  } catch (error) {
    console.error('Server error in deleteDeliveryZone:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
