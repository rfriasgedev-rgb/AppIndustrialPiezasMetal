const router = require('express').Router();
const ctrl = require('../controllers/users.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/roles', authorize('ADMIN'), ctrl.getRoles);
router.get('/', authorize('ADMIN'), ctrl.getAll);
router.post('/', authorize('ADMIN'), ctrl.create);
router.put('/:id', authorize('ADMIN'), ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);

module.exports = router;
