const { pool } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { auditLog } = require('../services/audit.service');

const getAll = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.is_active, u.last_login, u.created_at, r.name as role
       FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.full_name LIMIT 1000`
        );
        res.json(rows);
    } catch (err) { next(err); }
};

const create = async (req, res, next) => {
    try {
        const { full_name, email, password, role_id } = req.body;
        if (!full_name || !email || !password || !role_id)
            return res.status(400).json({ error: 'Todos los campos son requeridos.' });

        const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (exists.length) return res.status(409).json({ error: 'El email ya está registrado.' });

        const id = uuidv4();
        const password_hash = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (id, full_name, email, password_hash, role_id) VALUES (?, ?, ?, ?, ?)',
            [id, full_name, email, password_hash, role_id]
        );
        auditLog(pool, { tableName: 'users', recordId: id, action: 'INSERT', newValues: { full_name, email, role_id }, userId: req.user.id, req });
        res.status(201).json({ id, message: 'Usuario creado exitosamente.' });
    } catch (err) { next(err); }
};

const update = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const { id } = req.params;
        const { full_name, role_id, is_active } = req.body;
        const [old] = await conn.query('SELECT * FROM users WHERE id = ?', [id]);
        if (!old.length) return res.status(404).json({ error: 'Usuario no encontrado.' });

        await conn.query(
            'UPDATE users SET full_name = ?, role_id = ?, is_active = ? WHERE id = ?',
            [full_name ?? old[0].full_name, role_id ?? old[0].role_id, is_active ?? old[0].is_active, id]
        );
        auditLog(conn, { tableName: 'users', recordId: id, action: 'UPDATE', oldValues: old[0], newValues: req.body, userId: req.user.id, req });
        res.json({ message: 'Usuario actualizado.' });
    } catch (err) { next(err); } finally { conn.release(); }
};

const remove = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const { id } = req.params;
        const [old] = await conn.query('SELECT * FROM users WHERE id = ?', [id]);
        if (!old.length) return res.status(404).json({ error: 'Usuario no encontrado.' });

        await conn.query('DELETE FROM users WHERE id = ?', [id]);
        auditLog(conn, { tableName: 'users', recordId: id, action: 'DELETE', oldValues: old[0], userId: req.user.id, req });
        res.json({ message: 'Usuario eliminado exitosamente.' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ error: 'No se puede eliminar el usuario porque tiene registros asociados (Auditoría, Ordenes, etc). Se recomienda desactivarlo en su lugar.' });
        }
        next(err);
    } finally {
        conn.release();
    }
};

module.exports = { getAll, create, update, remove };
