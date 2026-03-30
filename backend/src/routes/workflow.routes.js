const router = require('express').Router();
const ctrl = require('../controllers/workflow.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/departments', ctrl.getDepartments);
router.get('/shifts', ctrl.getShifts);

module.exports = router;
