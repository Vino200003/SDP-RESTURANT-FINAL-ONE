const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const reservationReportController = require('../controllers/reservationReportController');
const { verifyAdminToken } = require('../middleware/authMiddleware');

// Protected admin routes
router.use(verifyAdminToken);

// Sales reports
router.get('/sales', reportController.getSalesReport);
router.get('/sales/summary', reportController.getSalesSummary);
router.get('/sales/by-category', reportController.getSalesByCategory);
router.get('/sales/by-payment', reportController.getSalesByPaymentMethod);
router.get('/sales/by-order-type', reportController.getSalesByOrderType);

// Menu item reports
router.get('/menu-items', reportController.getMenuItemsReport);
router.get('/menu-items/top-selling', reportController.getTopSellingItems);

// Time-based reports
router.get('/daily', reportController.getDailyReport);
router.get('/weekly', reportController.getWeeklyReport);
router.get('/monthly', reportController.getMonthlyReport);

// Reservation reports
router.get('/reservations', reservationReportController.getReservationsReport);

module.exports = router;
