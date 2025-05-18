const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// Ingredients routes
router.get('/ingredients', inventoryController.getAllIngredients);
router.get('/ingredients/:id', inventoryController.getIngredientById);
router.post('/ingredients', inventoryController.createIngredient);
router.put('/ingredients/:id', inventoryController.updateIngredient);
router.delete('/ingredients/:id', inventoryController.deleteIngredient);

// Suppliers routes
router.get('/suppliers', inventoryController.getAllSuppliers);
router.get('/suppliers/:id', inventoryController.getSupplierById);
router.post('/suppliers', inventoryController.createSupplier);
router.put('/suppliers/:id', inventoryController.updateSupplier);
router.delete('/suppliers/:id', inventoryController.deleteSupplier);

// Purchases routes
router.get('/purchases', inventoryController.getAllPurchases);
router.get('/purchases/:id', inventoryController.getPurchaseById);
router.post('/purchases', inventoryController.createPurchase);
router.put('/purchases/:id', inventoryController.updatePurchase);
router.delete('/purchases/:id', inventoryController.deletePurchase);

module.exports = router;
