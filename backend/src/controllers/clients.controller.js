const { pool } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { auditLog } = require('../services/audit.service');

const getAll = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, company_name, contact_name, email, phone, tax_id, credit_limit, outstanding_balance, is_active, created_at
       FROM clients ORDER BY company_name LIMIT 1000`
        );
        res.json(rows);
    } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado.' });
        res.json(rows[0]);
    } catch (err) { next(err); }
};

const create = async (req, res, next) => {
    try {
        const { company_name, contact_name, email, phone, address, tax_id, credit_limit } = req.body;
        if (!company_name) return res.status(400).json({ error: 'El nombre de empresa es requerido.' });
        const id = uuidv4();
        await pool.query(
            'INSERT INTO clients (id, company_name, contact_name, email, phone, address, tax_id, credit_limit, created_by) VALUES (?,?,?,?,?,?,?,?,?)',
            [id, company_name, contact_name, email, phone, address, tax_id, credit_limit || 0, req.user.id]
        );
        auditLog(pool, { tableName: 'clients', recordId: id, action: 'INSERT', newValues: req.body, userId: req.user.id, req });
        res.status(201).json({ id, message: 'Cliente creado exitosamente.' });
    } catch (err) { next(err); }
};

const update = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const { id } = req.params;
        const [old] = await conn.query('SELECT * FROM clients WHERE id = ?', [id]);
        if (!old.length) return res.status(404).json({ error: 'Cliente no encontrado.' });
        const { company_name, contact_name, email, phone, address, tax_id, credit_limit, is_active } = req.body;
        await conn.query(
            `UPDATE clients SET company_name=?, contact_name=?, email=?, phone=?, address=?, tax_id=?, credit_limit=?, is_active=? WHERE id=?`,
            [company_name ?? old[0].company_name, contact_name ?? old[0].contact_name, email ?? old[0].email,
            phone ?? old[0].phone, address ?? old[0].address, tax_id ?? old[0].tax_id,
            credit_limit ?? old[0].credit_limit, is_active ?? old[0].is_active, id]
        );
        auditLog(conn, { tableName: 'clients', recordId: id, action: 'UPDATE', oldValues: old[0], newValues: req.body, userId: req.user.id, req });
        res.json({ message: 'Cliente actualizado.' });
    } catch (err) { next(err); } finally { conn.release(); }
};

const remove = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const { id } = req.params;
        const [old] = await conn.query('SELECT * FROM clients WHERE id = ?', [id]);
        if (!old.length) return res.status(404).json({ error: 'Cliente no encontrado.' });

        await conn.query('DELETE FROM clients WHERE id = ?', [id]);
        auditLog(conn, { tableName: 'clients', recordId: id, action: 'DELETE', oldValues: old[0], userId: req.user.id, req });
        res.json({ message: 'Cliente eliminado exitosamente.' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ error: 'No se puede eliminar el cliente porque tiene órdenes de producción asociadas. Se recomienda desactivarlo cambiando su estado.' });
        }
        next(err);
    } finally {
        conn.release();
    }
};

module.exports = { getAll, getById, create, update, remove };
