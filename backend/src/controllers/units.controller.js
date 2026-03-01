const { pool } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { auditLog } = require('../services/audit.service');

// GET /units
const getAll = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM measurement_units ORDER BY name ASC');
        res.json(rows);
    } catch (err) { next(err); }
};

// POST /units
const create = async (req, res, next) => {
    try {
        const { name, abbreviation } = req.body;
        if (!name || !abbreviation) return res.status(400).json({ error: 'Nombre y abreviatura son obligatorios.' });

        // Verificar duplicados
        const [existing] = await pool.query('SELECT id FROM measurement_units WHERE abbreviation = ?', [abbreviation]);
        if (existing.length > 0) return res.status(409).json({ error: 'La abreviatura ya existe.' });

        const id = uuidv4();
        await pool.query('INSERT INTO measurement_units (id, name, abbreviation) VALUES (?, ?, ?)', [id, name, abbreviation]);

        auditLog(pool, { tableName: 'measurement_units', recordId: id, action: 'INSERT', newValues: req.body, userId: req.user.id, req });
        res.status(201).json({ id, message: 'Unidad de medida creada exitosamente.' });
    } catch (err) { next(err); }
};

// PUT /units/:id
const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, abbreviation } = req.body;

        const [old] = await pool.query('SELECT * FROM measurement_units WHERE id = ?', [id]);
        if (!old.length) return res.status(404).json({ error: 'Unidad de medida no encontrada.' });

        // Prevenir duplicados en abreviación si se cambia
        if (abbreviation && abbreviation !== old[0].abbreviation) {
            const [existing] = await pool.query('SELECT id FROM measurement_units WHERE abbreviation = ? AND id != ?', [abbreviation, id]);
            if (existing.length > 0) return res.status(409).json({ error: 'La abreviatura ya está en uso por otra unidad.' });
        }

        await pool.query(
            'UPDATE measurement_units SET name = ?, abbreviation = ? WHERE id = ?',
            [name || old[0].name, abbreviation || old[0].abbreviation, id]
        );

        auditLog(pool, { tableName: 'measurement_units', recordId: id, action: 'UPDATE', oldValues: old[0], newValues: { name, abbreviation }, userId: req.user.id, req });
        res.json({ message: 'Unidad de medida actualizada correctamente.' });
    } catch (err) { next(err); }
};

// DELETE /units/:id
const remove = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;

        const [old] = await pool.query('SELECT * FROM measurement_units WHERE id = ?', [id]);
        if (!old.length) {
            await conn.rollback();
            return res.status(404).json({ error: 'Unidad de medida no encontrada.' });
        }

        // Revisar dependencia en inventario
        const [dependency] = await conn.query('SELECT count(*) as count FROM inventory_items WHERE unit_of_measure_id = ?', [id]);
        if (dependency[0].count > 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'No se puede eliminar esta unidad de medida porque está siendo usada por materiales de inventario.' });
        }

        await conn.query('DELETE FROM measurement_units WHERE id = ?', [id]);
        auditLog(conn, { tableName: 'measurement_units', recordId: id, action: 'DELETE', oldValues: old[0], userId: req.user.id, req });

        await conn.commit();
        res.json({ message: 'Unidad de medida eliminada exitosamente.' });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

module.exports = { getAll, create, update, remove };
