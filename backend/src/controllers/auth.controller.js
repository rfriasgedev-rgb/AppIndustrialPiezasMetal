const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/connection');
const { auditLog } = require('../services/audit.service');

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son requeridos.' });

        const [rows] = await pool.query(
            'SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = ? AND u.is_active = 1',
            [email]
        );
        if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas.' });
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Credenciales inválidas.' });

        // Update last login
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        auditLog(pool, { tableName: 'users', recordId: user.id, action: 'UPDATE', newValues: { last_login: 'NOW()' }, userId: user.id, req });

        res.json({
            token,
            user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role },
        });
    } catch (err) {
        next(err);
    }
};

const me = async (req, res) => {
    res.json({ user: req.user });
};

module.exports = { login, me };
