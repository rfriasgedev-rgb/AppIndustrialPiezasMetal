const router = require('express').Router();
const ctrl = require('../controllers/production.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.get('/queue/:stage', ctrl.getQueue);

// My Orders — rutas específicas ANTES del /:id genérico para evitar conflictos
router.get('/my-orders/available', ctrl.getAvailableOrders);
router.post('/my-orders/claim/:detailId', ctrl.claimOrder);
router.get('/my-orders/history', ctrl.getMyOrdersHistory);

router.get('/:id', ctrl.getById);
router.post('/', authorize('ADMIN', 'SUPERVISOR', 'VENTAS'), ctrl.create);
router.put('/:id/advance', ctrl.advanceStage);
router.put('/:id', authorize('ADMIN', 'SUPERVISOR', 'VENTAS'), ctrl.update);
router.delete('/:id', authorize('ADMIN', 'SUPERVISOR', 'VENTAS'), ctrl.remove);

module.exports = router;
