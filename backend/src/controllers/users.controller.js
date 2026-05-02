const { pool } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { auditLog } = require('../services/audit.service');

const getAll = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.is_active, u.last_login, u.created_at, r.name as role, u.department_id, u.shift_id, d.name as department_name, s.name as shift_name
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             LEFT JOIN departments d ON u.department_id = d.id
             LEFT JOIN shifts s ON u.shift_id = s.id
             ORDER BY u.full_name LIMIT 1000`
        );
        res.json(rows);
    } catch (err) { next(err); }
};

// Retorna roles desde employee_roles (fuente de verdad de roles de producción)
const getRoles = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT id, name, description FROM employee_roles ORDER BY name');
        res.json(rows);
    } catch (err) { next(err); }
};

// Helper: dado un employee_role UUID, encuentra o crea la entrada en la tabla `roles`
// y devuelve el INT id que usa users.role_id
const resolveRoleId = async (conn, employeeRoleId) => {
    const [[empRole]] = await conn.query(
        'SELECT name, description FROM employee_roles WHERE id = ?', [employeeRoleId]
    );
    if (!empRole) throw new Error('Rol de empleado no encontrado.');

    // Insertar en roles si no existe (idempotente)
    await conn.query(
        'INSERT IGNORE INTO roles (name, description) VALUES (?, ?)',
        [empRole.name, empRole.description || '']
    );
    const [[role]] = await conn.query('SELECT id FROM roles WHERE name = ?', [empRole.name]);
    return role.id;
};

const create = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const { full_name, email, pw, employee_role_id, department_id, shift_id } = req.body;
        if (!full_name || !email || !pw || !employee_role_id)
            return res.status(400).json({ error: 'Todos los campos son requeridos.' });

        const [exists] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
        if (exists.length) return res.status(409).json({ error: 'El email ya está registrado.' });

        // Resolver employee_role UUID → roles INT id
        const role_id = await resolveRoleId(conn, employee_role_id);

        const id = uuidv4();
        const password_hash = await bcrypt.hash(pw, 10);
        await conn.query(
            'INSERT INTO users (id, full_name, email, password_hash, role_id, department_id, shift_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, full_name, email, password_hash, role_id, department_id || null, shift_id || null]
        );
        auditLog(pool, { tableName: 'users', recordId: id, action: 'INSERT', newValues: { full_name, email, role_id }, userId: req.user.id, req });
        res.status(201).json({ id, message: 'Usuario creado exitosamente.' });
    } catch (err) {
        next(err);
    } finally { conn.release(); }
};

const update = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const { id } = req.params;
        const { full_name, employee_role_id, is_active, department_id, shift_id, pw } = req.body;
        const [old] = await conn.query('SELECT * FROM users WHERE id = ?', [id]);
        if (!old.length) return res.status(404).json({ error: 'Usuario no encontrado.' });

        const f_full_name    = full_name   !== undefined ? full_name   : old[0].full_name;
        const f_is_active    = is_active   !== undefined ? is_active   : old[0].is_active;
        const f_department_id = department_id !== undefined ? department_id : (old[0].department_id || null);
        const f_shift_id     = shift_id    !== undefined ? shift_id    : (old[0].shift_id || null);

        // Resolver nuevo rol si viene en el body
        let f_role_id = old[0].role_id;
        if (employee_role_id) {
            f_role_id = await resolveRoleId(conn, employee_role_id);
        }

        let query = 'UPDATE users SET full_name = ?, role_id = ?, is_active = ?, department_id = ?, shift_id = ?';
        let params = [f_full_name, f_role_id, f_is_active, f_department_id, f_shift_id];

        if (pw && pw.trim() !== '') {
            query += ', password_hash = ?';
            params.push(await bcrypt.hash(pw, 10));
        }

        query += ' WHERE id = ?';
        params.push(id);

        try {
            await conn.query(query, params);
        } catch (updateErr) {
            if (updateErr.code === 'ER_NO_REFERENCED_ROW_2' || updateErr.errno === 1452) {
                return res.status(400).json({ error: 'El rol seleccionado no es válido.' });
            }
            throw updateErr;
        }

        auditLog(conn, { tableName: 'users', recordId: id, action: 'UPDATE', oldValues: old[0], newValues: req.body, userId: req.user.id, req });
        res.json({ message: 'Usuario actualizado.' });
    } catch (err) {
        console.error('User update error:', err);
        res.status(500).json({ error: err.message || 'Error interno del servidor.' });
    } finally { conn.release(); }
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

module.exports = { getAll, getRoles, create, update, remove };
