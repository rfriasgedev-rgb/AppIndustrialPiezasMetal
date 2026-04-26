const express = require('express');
const router = express.Router();
const controller = require('../controllers/company.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Todos los autenticados pueden leer (necesario para el header)
router.get('/', authenticate, controller.getCompany);

// Solo ADMIN puede crear/actualizar
router.put('/', authenticate, authorize('ADMIN'), controller.upsert);

module.exports = router;
