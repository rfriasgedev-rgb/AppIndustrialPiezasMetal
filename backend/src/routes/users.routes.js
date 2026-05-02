const router = require('express').Router();
const ctrl = require('../controllers/users.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/roles', ctrl.getRoles);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
