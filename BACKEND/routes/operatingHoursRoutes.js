const express = require('express');
const router = express.Router();
const operatingHoursController = require('../controllers/operatingHoursController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

// GET all operating hours - public route, no auth required
router.get('/', operatingHoursController.getAllOperatingHours);

// CHECK if restaurant is currently open - public route, no auth required
router.get('/status/open', operatingHoursController.checkIfRestaurantOpen);

// GET operating hours for specific day - public route, no auth required
router.get('/:day', operatingHoursController.getOperatingHoursByDay);

// UPDATE operating hours for a specific day - protected, admin only
router.put('/:day', protectAdmin, operatingHoursController.updateOperatingHours);

// BATCH UPDATE multiple days' operating hours - protected, admin only
router.put('/', protectAdmin, operatingHoursController.batchUpdateOperatingHours);

module.exports = router;