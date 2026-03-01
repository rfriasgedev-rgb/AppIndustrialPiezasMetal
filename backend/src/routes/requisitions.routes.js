const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const requisitionsController = require('../controllers/requisitions.controller');

// Generar o recuperar Requisición para una Orden
router.post('/generate/:orderId', authenticate, authorize('ADMIN', 'SUPERVISOR', 'OPERADOR'), requisitionsController.generateRequisition);

// Checkear si la orden tiene requisición
router.get('/order/:orderId', authenticate, authorize('ADMIN', 'SUPERVISOR', 'OPERADOR'), requisitionsController.getByOrderId);

// Descargar/Ver el PDF de la requisición
router.get('/:id/pdf', authenticate, authorize('ADMIN', 'SUPERVISOR', 'OPERADOR'), requisitionsController.generateRequisitionPDF);

module.exports = router;
