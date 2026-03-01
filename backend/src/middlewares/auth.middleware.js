const jwt = require('jsonwebtoken');
const { pool } = require('../db/connection');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token de autenticación requerido.' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
