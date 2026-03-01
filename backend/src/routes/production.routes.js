const router = require('express').Router();
const ctrl = require('../controllers/production.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authorize('ADMIN', 'SUPERVISOR', 'VENTAS'), ctrl.create);
router.put('/:id/advance', authorize('ADMIN', 'SUPERVISOR', 'OPERADOR'), ctrl.advanceStage);
router.put('/:id', authorize('ADMIN', 'SUPERVISOR', 'VENTAS'), ctrl.update);
router.delete('/:id', authorize('ADMIN', 'SUPERVISOR', 'VENTAS'), ctrl.remove);

module.exports = router;
