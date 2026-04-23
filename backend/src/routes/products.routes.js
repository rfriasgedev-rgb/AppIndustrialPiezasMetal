const router = require('express').Router();
const ctrl = require('../controllers/products.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authorize('ADMIN', 'VENTAS', 'SUPERVISOR'), ctrl.create);
router.put('/:id', authorize('ADMIN', 'VENTAS', 'SUPERVISOR'), ctrl.update);
router.delete('/:id', authorize('ADMIN', 'VENTAS', 'SUPERVISOR'), ctrl.remove);

module.exports = router;
