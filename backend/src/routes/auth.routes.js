const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { login, me, logout } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { loginLimiter } = require('../middlewares/rateLimiter.middleware');
const { validateRequest } = require('../middlewares/validation.middleware');

router.post('/login', [
    loginLimiter,
    body('email').isEmail().withMessage('Debe ser un correo electrónico válido.').normalizeEmail(),
    body('password').notEmpty().withMessage('La contraseña no puede estar vacía.'),
    validateRequest
], login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

module.exports = router;
