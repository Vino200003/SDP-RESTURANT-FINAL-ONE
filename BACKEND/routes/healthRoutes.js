const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

router.get('/check', healthController.checkHealth);

module.exports = router;
