const jwt = require('jsonwebtoken');
const { pool } = require('../db/connection');

const authenticate = async (req, res, next) => {
    try {
        let token = req.cookies.token;

        // Fallback to Bearer token for backward compatibility or mobile apps if needed
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ error: 'Token de autenticación requerido.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'metal_erp_default_secret_key_123!');
        const [rows] = await pool.query(
            'SELECT u.id, u.full_name, u.email, u.is_active, r.name AS role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
            [decoded.id]
        );
        if (!rows.length || !rows[0].is_active) {
            return res.status(401).json({ error: 'Usuario no autenticado o inactivo.' });
        }
        req.user = rows[0];
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};

const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}.` });
    }
    next();
};

module.exports = { authenticate, authorize };
