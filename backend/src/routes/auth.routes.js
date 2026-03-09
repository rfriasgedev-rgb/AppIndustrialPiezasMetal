const express = require('express');
const router = express.Router();
const { login, me, logout } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { loginLimiter } = require('../middlewares/rateLimiter.middleware');

router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

module.exports = router;
