const db = require('../config/db');
const util = require('util');

// Convert db.query to use promises if not already using mysql2/promise
const query = util.promisify(db.query).bind(db);

// ==================== Ingredient Controllers ====================
exports.getAllIngredients = async (req, res) => {
  try {
    const rows = await query('SELECT * FROM ingredients ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({ message: 'Error fetching ingredients', error: error.message });
  }
};

exports.getIngredientById = async (req, res) => {
  try {
    const rows = await query('SELECT * FROM ingredients WHERE id = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Ingredient not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching ingredient:', error);
    res.status(500).json({ message: 'Error fetching ingredient', error: error.message });
  }
};

exports.createIngredient = async (req, res) => {
  try {
    const { name, variant, category, unit, current_stock } = req.body;
    
    if (!name || !category || !unit) {
      return res.status(400).json({ message: 'Name, category, and unit are required' });
    }
    
    const result = await query(
      'INSERT INTO ingredients (name, variant, category, unit, current_stock) VALUES (?, ?, ?, ?, ?)',
      [name, variant, category, unit, current_stock || 0]
    );
    
    res.status(201).json({
      message: 'Ingredient created successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error creating ingredient:', error);
    res.status(500).json({ message: 'Error creating ingredient', error: error.message });
  }
};

exports.updateIngredient = async (req, res) => {
  try {
    const { name, variant, category, unit, current_stock } = req.body;
    const id = req.params.id;
    
    if (!name || !category || !unit) {
      return res.status(400).json({ message: 'Name, category, and unit are required' });
    }
    
    const result = await query(
      'UPDATE ingredients SET name = ?, variant = ?, category = ?, unit = ?, current_stock = ? WHERE id = ?',
      [name, variant, category, unit, current_stock, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ingredient not found' });
    }
    
    res.json({ message: 'Ingredient updated successfully' });
  } catch (error) {
    console.error('Error updating ingredient:', error);
    res.status(500).json({ message: 'Error updating ingredient', error: error.message });
  }
};

exports.deleteIngredient = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Check if ingredient is used in purchases
    const purchases = await query('SELECT COUNT(*) AS count FROM purchases WHERE ingredient_id = ?', [id]);
    
    if (purchases[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete ingredient with purchase history',
        count: purchases[0].count
      });
    }
    
    const result = await query('DELETE FROM ingredients WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Ingredient not found' });
    }
    
    res.json({ message: 'Ingredient deleted successfully' });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    res.status(500).json({ message: 'Error deleting ingredient', error: error.message });
  }
};

// ==================== Supplier Controllers ====================
exports.getAllSuppliers = async (req, res) => {
  try {
    const rows = await query('SELECT * FROM suppliers ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'Error fetching suppliers', error: error.message });
  }
};

exports.getSupplierById = async (req, res) => {
  try {
    const rows = await query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ message: 'Error fetching supplier', error: error.message });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const { name, contact_phone, email, address, status, notes } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Supplier name is required' });
    }
    
    const result = await query(
      'INSERT INTO suppliers (name, contact_phone, email, address, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [name, contact_phone, email, address, status || 'active', notes]
    );
    
    res.status(201).json({
      message: 'Supplier created successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ message: 'Error creating supplier', error: error.message });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const { name, contact_phone, email, address, status, notes } = req.body;
    const id = req.params.id;
    
    if (!name) {
      return res.status(400).json({ message: 'Supplier name is required' });
    }
    
    const result = await query(
      'UPDATE suppliers SET name = ?, contact_phone = ?, email = ?, address = ?, status = ?, notes = ? WHERE id = ?',
      [name, contact_phone, email, address, status, notes, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    res.json({ message: 'Supplier updated successfully' });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ message: 'Error updating supplier', error: error.message });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Check if supplier is used in purchases
    const purchases = await query('SELECT COUNT(*) AS count FROM purchases WHERE supplier_id = ?', [id]);
    
    if (purchases[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete supplier with purchase history',
        count: purchases[0].count
      });
    }
    
    const result = await query('DELETE FROM suppliers WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ message: 'Error deleting supplier', error: error.message });
  }
};

// ==================== Purchase Controllers ====================
exports.getAllPurchases = async (req, res) => {
  try {
    // Join with ingredients and suppliers tables to get names
    const rows = await query(`
      SELECT p.*, i.name AS ingredient_name, i.unit, s.name AS supplier_name 
      FROM purchases p
      JOIN ingredients i ON p.ingredient_id = i.id
      JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.purchase_date DESC
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ message: 'Error fetching purchases', error: error.message });
  }
};

exports.getPurchaseById = async (req, res) => {
  try {
    const rows = await query(`
      SELECT p.*, i.name AS ingredient_name, i.unit, s.name AS supplier_name 
      FROM purchases p
      JOIN ingredients i ON p.ingredient_id = i.id
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching purchase:', error);
    res.status(500).json({ message: 'Error fetching purchase', error: error.message });
  }
};

exports.createPurchase = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { ingredient_id, supplier_id, quantity, unit_price, purchase_date, notes } = req.body;
    
    if (!ingredient_id || !supplier_id || !quantity || !unit_price || !purchase_date) {
      return res.status(400).json({ 
        message: 'Ingredient ID, supplier ID, quantity, unit price, and purchase date are required' 
      });
    }
    
    // Insert purchase record
    const [purchaseResult] = await connection.query(
      'INSERT INTO purchases (ingredient_id, supplier_id, quantity, unit_price, purchase_date, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [ingredient_id, supplier_id, quantity, unit_price, purchase_date, notes]
    );
    
    // Update ingredient stock
    const [updateResult] = await connection.query(
      'UPDATE ingredients SET current_stock = current_stock + ? WHERE id = ?',
      [quantity, ingredient_id]
    );
    
    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Ingredient not found' });
    }
    
    await connection.commit();
    
    res.status(201).json({
      message: 'Purchase recorded successfully',
      id: purchaseResult.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error recording purchase:', error);
    res.status(500).json({ message: 'Error recording purchase', error: error.message });
  } finally {
    connection.release();
  }
};

exports.updatePurchase = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { ingredient_id, supplier_id, quantity, unit_price, purchase_date, notes } = req.body;
    const id = req.params.id;
    
    if (!ingredient_id || !supplier_id || !quantity || !unit_price || !purchase_date) {
      return res.status(400).json({ 
        message: 'Ingredient ID, supplier ID, quantity, unit price, and purchase date are required' 
      });
    }
    
    // Get the old purchase to calculate stock adjustment
    const [oldPurchase] = await connection.query('SELECT * FROM purchases WHERE id = ?', [id]);
    
    if (oldPurchase.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Purchase not found' });
    }
    
    // Calculate stock adjustment
    const oldQuantity = oldPurchase[0].quantity;
    const quantityDifference = quantity - oldQuantity;
    
    // Only adjust stock if the ingredient or quantity changed
    if (quantityDifference !== 0 || ingredient_id !== oldPurchase[0].ingredient_id) {
      // If ingredient changed, revert old ingredient stock
      if (ingredient_id !== oldPurchase[0].ingredient_id) {
        await connection.query(
          'UPDATE ingredients SET current_stock = current_stock - ? WHERE id = ?',
          [oldQuantity, oldPurchase[0].ingredient_id]
        );
        
        // Add full quantity to new ingredient
        await connection.query(
          'UPDATE ingredients SET current_stock = current_stock + ? WHERE id = ?',
          [quantity, ingredient_id]
        );
      } else {
        // Just adjust the quantity difference for the same ingredient
        await connection.query(
          'UPDATE ingredients SET current_stock = current_stock + ? WHERE id = ?',
          [quantityDifference, ingredient_id]
        );
      }
    }
    
    // Update the purchase record
    const [updateResult] = await connection.query(
      'UPDATE purchases SET ingredient_id = ?, supplier_id = ?, quantity = ?, unit_price = ?, purchase_date = ?, notes = ? WHERE id = ?',
      [ingredient_id, supplier_id, quantity, unit_price, purchase_date, notes, id]
    );
    
    await connection.commit();
    
    res.json({ message: 'Purchase updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating purchase:', error);
    res.status(500).json({ message: 'Error updating purchase', error: error.message });
  } finally {
    connection.release();
  }
};

exports.deletePurchase = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const id = req.params.id;
    
    // Get the purchase to adjust stock
    const [purchase] = await connection.query('SELECT * FROM purchases WHERE id = ?', [id]);
    
    if (purchase.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Purchase not found' });
    }
    
    // Adjust ingredient stock
    const [updateResult] = await connection.query(
      'UPDATE ingredients SET current_stock = current_stock - ? WHERE id = ?',
      [purchase[0].quantity, purchase[0].ingredient_id]
    );
    
    // Delete the purchase record
    const [deleteResult] = await connection.query('DELETE FROM purchases WHERE id = ?', [id]);
    
    await connection.commit();
    
    res.json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting purchase:', error);
    res.status(500).json({ message: 'Error deleting purchase', error: error.message });
  } finally {
    connection.release();
  }
};
