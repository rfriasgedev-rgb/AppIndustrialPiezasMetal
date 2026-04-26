const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

// Obtener estadísticas de operadores por rol (dashboard)
router.get('/operator-stats', analyticsController.getOperatorStats);

module.exports = router;
