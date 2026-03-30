const router = require('express').Router();
const ctrl = require('../controllers/planning.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/', authorize('ADMIN', 'SUPERVISOR', 'VENTAS'), ctrl.getPlanningStats);

module.exports = router;
