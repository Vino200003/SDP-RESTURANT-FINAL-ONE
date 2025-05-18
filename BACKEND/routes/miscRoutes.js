const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/health-check', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend server is running' });
});

module.exports = router;
