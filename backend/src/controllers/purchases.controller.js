const { pool } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { auditLog } = require('../services/audit.service');

const getAll = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT p.*, i.name as item_name, u.full_name as created_by_name
       FROM purchases p JOIN inventory_items i ON p.item_id = i.id
       JOIN users u ON p.created_by = u.id ORDER BY p.created_at DESC`
        );
        res.json(rows);
    } catch (err) { next(err); }
};

// POST /purchases - Crea una orden de compra con idempotencia
const create = async (req, res, next) => {
    try {
        const { idempotency_key, supplier_name, item_id, quantity_ordered, unit_price, expected_date, notes } = req.body;
        if (!supplier_name || !item_id || !quantity_ordered || !unit_price)
            return res.status(400).json({ error: 'Proveedor, item, cantidad y precio son requeridos.' });

        // Idempotency check
        if (idempotency_key) {
            const [existing] = await pool.query('SELECT id FROM purchases WHERE idempotency_key = ?', [idempotency_key]);
            if (existing.length) return res.status(200).json({ id: existing[0].id, message: 'Compra ya registrada (idempotente).' });
        }

        const id = uuidv4();
        await pool.query(
            'INSERT INTO purchases (id, idempotency_key, supplier_name, item_id, quantity_ordered, unit_price, expected_date, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?)',
            [id, idempotency_key || uuidv4(), supplier_name, item_id, quantity_ordered, unit_price, expected_date, notes, req.user.id]
        );
        auditLog(pool, { tableName: 'purchases', recordId: id, action: 'INSERT', newValues: req.body, userId: req.user.id, req });
        res.status(201).json({ id, message: 'Orden de compra creada.' });
    } catch (err) { next(err); }
};

// PUT /purchases/:id/receive - Recepción de material (actualiza inventario atómicamente)
const receive = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const { quantity_received } = req.body;
        const [[purchase]] = await conn.query('SELECT * FROM purchases WHERE id = ? FOR UPDATE', [id]);
        if (!purchase) { await conn.rollback(); return res.status(404).json({ error: 'Compra no encontrada.' }); }
        if (['RECEIVED', 'CANCELLED'].includes(purchase.status)) {
            await conn.rollback(); return res.status(409).json({ error: `No se puede modificar una compra en estado ${purchase.status}.` });
        }

        const totalReceived = parseFloat(purchase.quantity_received) + parseFloat(quantity_received);
        const newStatus = totalReceived >= parseFloat(purchase.quantity_ordered) ? 'RECEIVED' : 'PARTIAL';

        await conn.query('UPDATE purchases SET quantity_received = ?, status = ? WHERE id = ?', [totalReceived, newStatus, id]);
        // Update inventory atomically
        await conn.query('UPDATE inventory_items SET quantity_available = quantity_available + ? WHERE id = ?', [quantity_received, purchase.item_id]);
        await conn.query(
            'INSERT INTO inventory_movements (id, item_id, movement_type, quantity, reference_type, reference_id, notes, created_by) VALUES (?,?,?,?,?,?,?,?)',
            [uuidv4(), purchase.item_id, 'IN', quantity_received, 'purchase', id, 'Recepción de compra', req.user.id]
        );
        await conn.commit();
        auditLog(pool, { tableName: 'purchases', recordId: id, action: 'UPDATE', oldValues: { status: purchase.status, quantity_received: purchase.quantity_received }, newValues: { status: newStatus, quantity_received: totalReceived }, userId: req.user.id, req });
        res.json({ message: `Material recibido. Estado actualizado a: ${newStatus}` });
    } catch (err) { await conn.rollback(); next(err); } finally { conn.release(); }
};

module.exports = { getAll, create, receive };
