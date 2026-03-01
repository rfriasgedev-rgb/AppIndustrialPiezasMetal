const router = require('express').Router();
const ctrl = require('../controllers/inventory.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/categories', ctrl.getCategories);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authorize('ADMIN', 'ALMACENISTA'), ctrl.create);
router.post('/:id/adjust', authorize('ADMIN', 'ALMACENISTA'), ctrl.adjustStock);
router.put('/:id', authorize('ADMIN', 'ALMACENISTA'), ctrl.update);
router.delete('/:id', authorize('ADMIN', 'ALMACENISTA'), ctrl.remove);

module.exports = router;
