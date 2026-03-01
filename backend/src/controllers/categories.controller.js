const { pool } = require('../db/connection');
const { auditLog } = require('../services/audit.service');

// GET /categories
const getAll = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM material_categories ORDER BY name ASC');
        res.json(rows);
    } catch (err) { next(err); }
};

// POST /categories
const create = async (req, res, next) => {
    try {
        const { name, description, unit_of_measure } = req.body;
        if (!name || !unit_of_measure) return res.status(400).json({ error: 'Nombre y unidad de medida son obligatorios.' });

        // Verificar duplicados
        const [existing] = await pool.query('SELECT id FROM material_categories WHERE name = ?', [name]);
        if (existing.length > 0) return res.status(409).json({ error: 'La categoría ya existe.' });

        const [result] = await pool.query(
            'INSERT INTO material_categories (name, description, unit_of_measure) VALUES (?, ?, ?)',
            [name, description, unit_of_measure]
        );
        const newId = result.insertId;

        auditLog(pool, { tableName: 'material_categories', recordId: newId, action: 'INSERT', newValues: req.body, userId: req.user.id, req });
        res.status(201).json({ id: newId, message: 'Categoría creada exitosamente.' });
    } catch (err) { next(err); }
};

// PUT /categories/:id
const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, unit_of_measure } = req.body;

        const [old] = await pool.query('SELECT * FROM material_categories WHERE id = ?', [id]);
        if (!old.length) return res.status(404).json({ error: 'Categoría no encontrada.' });

        // Prevenir duplicados en el nombre
        if (name && name.trim().toLowerCase() !== old[0].name.trim().toLowerCase()) {
            const [existing] = await pool.query('SELECT id FROM material_categories WHERE name = ? AND id != ?', [name, id]);
            if (existing.length > 0) return res.status(409).json({ error: 'El nombre de categoría ya está en uso.' });
        }

        await pool.query(
            'UPDATE material_categories SET name = ?, description = ?, unit_of_measure = ? WHERE id = ?',
            [name || old[0].name, description || old[0].description, unit_of_measure || old[0].unit_of_measure, id]
        );

        auditLog(pool, { tableName: 'material_categories', recordId: id, action: 'UPDATE', oldValues: old[0], newValues: { name, description, unit_of_measure }, userId: req.user.id, req });
        res.json({ message: 'Categoría actualizada correctamente.' });
    } catch (err) { next(err); }
};

// DELETE /categories/:id
const remove = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;

        const [old] = await pool.query('SELECT * FROM material_categories WHERE id = ?', [id]);
        if (!old.length) {
            await conn.rollback();
            return res.status(404).json({ error: 'Categoría no encontrada.' });
        }

        // Revisar dependencia en inventario
        const [dependency] = await conn.query('SELECT count(*) as count FROM inventory_items WHERE category_id = ?', [id]);
        if (dependency[0].count > 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'No se puede eliminar esta categoría porque hay materiales de inventario vinculados a ella.' });
        }

        await conn.query('DELETE FROM material_categories WHERE id = ?', [id]);
        auditLog(conn, { tableName: 'material_categories', recordId: id, action: 'DELETE', oldValues: old[0], userId: req.user.id, req });

        await conn.commit();
        res.json({ message: 'Categoría eliminada exitosamente.' });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

module.exports = { getAll, create, update, remove };
