const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const auth = require('../middleware/auth');

// Public routes - no authentication required
router.get('/tables', reservationController.getAllTables);
router.get('/available-tables', reservationController.getAvailableTablesForDateTime);

// Create reservation - optional authentication
router.post('/', reservationController.createReservation);

// Allow getting user reservations without authentication when userId is provided in query
router.get('/user', reservationController.getUserReservations);

// Protected routes - require authentication
router.get('/', auth, reservationController.getAllReservations);
router.get('/stats', auth, reservationController.getReservationStats);
router.get('/:id', auth, reservationController.getReservationById);
router.put('/:id', auth, reservationController.updateReservation);
router.delete('/:id', auth, reservationController.deleteReservation);
router.patch('/:id/status', auth, reservationController.updateReservationStatus);

// Table management routes (protected)
router.post('/tables', auth, reservationController.createTable);
router.patch('/tables/:tableNo/status', auth, reservationController.updateTableStatus);
router.patch('/tables/:tableNo/active', auth, reservationController.setTableActiveStatus);

module.exports = router;
