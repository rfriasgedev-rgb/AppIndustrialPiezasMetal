const router = require('express').Router();
const ctrl = require('../controllers/purchases.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/', authorize('ADMIN', 'ALMACENISTA', 'SUPERVISOR'), ctrl.getAll);
router.post('/', authorize('ADMIN', 'ALMACENISTA'), ctrl.create);
router.put('/:id/receive', authorize('ADMIN', 'ALMACENISTA'), ctrl.receive);

module.exports = router;
