const express = require('express');
const router = express.Router();
const deliveryZoneController = require('../controllers/deliveryZoneController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// Public routes for customer app
router.get('/public', deliveryZoneController.getAllDeliveryZones); // Get active zones only
router.get('/public/:id', deliveryZoneController.getDeliveryZoneById);
router.get('/public/:id/fee', deliveryZoneController.getDeliveryFeeByZoneId);

// Admin routes - protected
router.get('/', deliveryZoneController.getAllDeliveryZones);
router.get('/:id', deliveryZoneController.getDeliveryZoneById);
router.post('/', deliveryZoneController.createDeliveryZone);
router.put('/:id', deliveryZoneController.updateDeliveryZone);
router.delete('/:id', deliveryZoneController.deleteDeliveryZone);

module.exports = router;
