const { pool } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { auditLog } = require('../services/audit.service');

// GET /inventory - Listar items con categoría
const getAll = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT i.*, c.name as category_name, COALESCE(u.abbreviation, c.unit_of_measure) as unit_of_measure
       FROM inventory_items i 
       JOIN material_categories c ON i.category_id = c.id
       LEFT JOIN measurement_units u ON i.unit_of_measure_id = u.id
       ORDER BY i.is_active DESC, c.name, i.name LIMIT 1000`
        );
        res.json(rows);
    } catch (err) { next(err); }
};

// GET /inventory/categories
const getCategories = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM material_categories ORDER BY name');
        res.json(rows);
    } catch (err) { next(err); }
};

// GET /inventory/:id - Item con historial de movimientos
const getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [[item]] = await pool.query(
            `SELECT i.*, c.name as category_name, COALESCE(u.abbreviation, c.unit_of_measure) as unit_of_measure 
       FROM inventory_items i
       JOIN material_categories c ON i.category_id = c.id 
       LEFT JOIN measurement_units u ON i.unit_of_measure_id = u.id
       WHERE i.id = ?`, [id]
        );
        if (!item) return res.status(404).json({ error: 'Item no encontrado.' });
        const [movements] = await pool.query(
            `SELECT m.*, u.full_name as user_name FROM inventory_movements m
       LEFT JOIN users u ON m.created_by = u.id
       WHERE m.item_id = ? ORDER BY m.created_at DESC LIMIT 50`, [id]
        );
        res.json({ ...item, movements });
    } catch (err) { next(err); }
};

// POST /inventory - Crear item
const create = async (req, res, next) => {
    try {
        const { category_id, name, sku, description, quantity_available, reorder_point, unit_cost, location, unit_of_measure_id } = req.body;
        if (!category_id || !name) return res.status(400).json({ error: 'Categoría y nombre son requeridos.' });
        const id = uuidv4();
        await pool.query(
            'INSERT INTO inventory_items (id, category_id, name, sku, description, quantity_available, reorder_point, unit_cost, location, unit_of_measure_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
            [id, category_id, name, sku, description, quantity_available || 0, reorder_point || 0, unit_cost || 0, location, unit_of_measure_id || null]
        );
        auditLog(pool, { tableName: 'inventory_items', recordId: id, action: 'INSERT', newValues: req.body, userId: req.user.id, req });
        res.status(201).json({ id, message: 'Item creado exitosamente.' });
    } catch (err) { next(err); }
};

// POST /inventory/:id/adjust - Ajuste de stock con trazabilidad
const adjustStock = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const { quantity, movement_type, notes } = req.body;
        if (!quantity || !movement_type) return res.status(400).json({ error: 'Cantidad y tipo de movimiento son requeridos.' });

        const [[item]] = await conn.query('SELECT * FROM inventory_items WHERE id = ? FOR UPDATE', [id]);
        if (!item) { await conn.rollback(); return res.status(404).json({ error: 'Item no encontrado.' }); }

        let newQty = parseFloat(item.quantity_available);
        if (movement_type === 'IN' || movement_type === 'RELEASE') newQty += parseFloat(quantity);
        else if (movement_type === 'OUT' || movement_type === 'RESERVE') newQty -= parseFloat(quantity);
        else if (movement_type === 'ADJUST') newQty = parseFloat(quantity);

        if (newQty < 0) { await conn.rollback(); return res.status(409).json({ error: 'Stock insuficiente.' }); }

        await conn.query('UPDATE inventory_items SET quantity_available = ? WHERE id = ?', [newQty, id]);
        await conn.query(
            'INSERT INTO inventory_movements (id, item_id, movement_type, quantity, notes, created_by) VALUES (?,?,?,?,?,?)',
            [uuidv4(), id, movement_type, quantity, notes, req.user.id]
        );
        await conn.commit();
        auditLog(pool, { tableName: 'inventory_items', recordId: id, action: 'UPDATE', oldValues: { quantity_available: item.quantity_available }, newValues: { quantity_available: newQty }, userId: req.user.id, req });
        res.json({ message: 'Stock ajustado correctamente.', new_quantity: newQty });
    } catch (err) { await conn.rollback(); next(err); } finally { conn.release(); }
};

// PUT /inventory/:id - Editar Item base
const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { category_id, name, sku, description, reorder_point, unit_cost, location, is_active, unit_of_measure_id } = req.body;
        console.log('DEBUG UPDATE:', { id, body: req.body });

        const [old] = await pool.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
        if (!old.length) return res.status(404).json({ error: 'Item no encontrado.' });

        let newCategoryId = category_id !== undefined ? category_id : old[0].category_id;
        if (newCategoryId === "") newCategoryId = null;

        let newUomId = unit_of_measure_id !== undefined ? unit_of_measure_id : old[0].unit_of_measure_id;
        if (newUomId === "") newUomId = null;

        await pool.query(
            `UPDATE inventory_items SET category_id=?, name=?, sku=?, description=?, reorder_point=?, unit_cost=?, location=?, is_active=?, unit_of_measure_id=? WHERE id=?`,
            [
                newCategoryId, name ?? old[0].name, sku ?? old[0].sku,
                description ?? old[0].description, reorder_point ?? old[0].reorder_point,
                unit_cost ?? old[0].unit_cost, location ?? old[0].location,
                is_active !== undefined ? (is_active ? 1 : 0) : old[0].is_active,
                newUomId,
                id
            ]
        );
        auditLog(pool, { tableName: 'inventory_items', recordId: id, action: 'UPDATE', oldValues: old[0], newValues: req.body, userId: req.user.id, req });
        res.json({ message: 'Item actualizado exitosamente.' });
    } catch (err) { next(err); }
};

// DELETE /inventory/:id - Borrar suave o estricto según uso
const remove = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const [old] = await conn.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
        if (!old.length) { await conn.rollback(); return res.status(404).json({ error: 'Item no encontrado.' }); }

        // Bloquear si tiene cantidad disponible o reservada
        if (parseFloat(old[0].quantity_available) > 0 || parseFloat(old[0].quantity_reserved) > 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'No se puede eliminar un item que aún tiene existencias o reservas activas. Márquelo como inactivo.' });
        }

        // Bloquear si hay historial (mejor desactivar) - Opcionalmente permitirlo validando si el cliente lo tolera, en estricto rigor:
        const [movs] = await conn.query('SELECT count(*) as count FROM inventory_movements WHERE item_id = ?', [id]);
        if (movs[0].count > 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'Item con historial de movimientos. Por integridad, edítelo y desactívelo en lugar de borrarlo.' });
        }

        await conn.query('DELETE FROM inventory_items WHERE id = ?', [id]);
        auditLog(conn, { tableName: 'inventory_items', recordId: id, action: 'DELETE', oldValues: old[0], userId: req.user.id, req });
        await conn.commit();
        res.json({ message: 'Item eliminado permanentemente.' });
    } catch (err) { await conn.rollback(); next(err); } finally { conn.release(); }
};

module.exports = { getAll, getCategories, getById, create, update, remove, adjustStock };
