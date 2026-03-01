const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.get('/stats', authenticate, ctrl.getStats);

module.exports = router;
