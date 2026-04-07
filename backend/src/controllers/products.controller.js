const { pool } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { auditLog } = require('../services/audit.service');
const fs = require('fs');
const path = require('path');

const getAll = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, name, part_number, description, requires_assembly, standard_hours, sale_price, image_url, is_active, created_at
       FROM product_catalog ORDER BY name LIMIT 1000`
        );
        res.json(rows);
    } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM product_catalog WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado.' });

        // Cargar Lista de Materiales (BOM) con su unidad de medida correcta
        const [materials] = await pool.query(
            `SELECT pm.item_id, pm.quantity_required, i.name, i.sku as part_number, 
                    COALESCE(u.abbreviation, c.unit_of_measure) as unit_measure 
             FROM product_materials pm 
             JOIN inventory_items i ON pm.item_id = i.id 
             JOIN material_categories c ON i.category_id = c.id
             LEFT JOIN measurement_units u ON i.unit_of_measure_id = u.id
             WHERE pm.product_id = ?`,
            [req.params.id]
        );

        const product = rows[0];
        product.materials = materials;

        res.json(product);
    } catch (err) { next(err); }
};

const create = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { name, part_number, description, requires_assembly, standard_hours, sale_price } = req.body;
        if (!name) {
            await conn.rollback();
            return res.status(400).json({ error: 'El nombre del producto es requerido.' });
        }

        let materials = [];
        if (req.body.materials) {
            try {
                materials = typeof req.body.materials === 'string' ? JSON.parse(req.body.materials) : req.body.materials;
            } catch (e) {
                // Ignore parse error, it might already be an array or empty
            }
        }

        const image_url = req.file ? `/uploads/products/${req.file.filename}` : null;

        const id = uuidv4();
        await conn.query(
            `INSERT INTO product_catalog (id, name, part_number, description, requires_assembly, standard_hours, sale_price, image_url) 
       VALUES (?,?,?,?,?,?,?,?)`,
            [id, name, part_number, description, String(requires_assembly) === 'true' || String(requires_assembly) === '1' ? 1 : 0, standard_hours || 0, sale_price || 0, image_url]
        );

        // Insertar materiales BOM
        if (materials && materials.length > 0) {
            for (const mat of materials) {
                await conn.query(
                    `INSERT INTO product_materials (product_id, item_id, quantity_required) VALUES (?, ?, ?)`,
                    [id, mat.item_id, mat.quantity_required]
                );
            }
        }

        await conn.commit();
        auditLog(pool, { tableName: 'product_catalog', recordId: id, action: 'INSERT', newValues: { name, part_number, image_url }, userId: req.user.id, req });
        res.status(201).json({ id, message: 'Producto creado exitosamente.' });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

const update = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const [old] = await conn.query('SELECT * FROM product_catalog WHERE id = ? FOR UPDATE', [id]);
        if (!old.length) {
            await conn.rollback();
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        const { name, part_number, description, requires_assembly, standard_hours, sale_price, is_active } = req.body;

        let materials = [];
        if (req.body.materials) {
            try {
                materials = typeof req.body.materials === 'string' ? JSON.parse(req.body.materials) : req.body.materials;
            } catch (e) {
                // Ignore parse error
            }
        }

        let image_url = old[0].image_url;
        if (req.file) {
            image_url = `/uploads/products/${req.file.filename}`;
            // Delete old file if exists
            if (old[0].image_url) {
                const oldPath = path.join(__dirname, '../../', old[0].image_url);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        }

        await conn.query(
            `UPDATE product_catalog SET name=?, part_number=?, description=?, requires_assembly=?, standard_hours=?, sale_price=?, image_url=?, is_active=? WHERE id=?`,
            [
                name ?? old[0].name,
                part_number ?? old[0].part_number,
                description ?? old[0].description,
                requires_assembly !== undefined ? (String(requires_assembly) === 'true' || String(requires_assembly) === '1' ? 1 : 0) : old[0].requires_assembly,
                standard_hours ?? old[0].standard_hours,
                sale_price ?? old[0].sale_price,
                image_url,
                is_active !== undefined ? (String(is_active) === 'true' || String(is_active) === '1' ? 1 : 0) : old[0].is_active,
                id
            ]
        );

        // Actualizar Lista de Materiales (BOM)
        if (req.body.materials !== undefined) {
            // Borrar anteriores
            await conn.query('DELETE FROM product_materials WHERE product_id = ?', [id]);
            // Insertar nuevos
            if (materials && materials.length > 0) {
                for (const mat of materials) {
                    await conn.query(
                        `INSERT INTO product_materials (product_id, item_id, quantity_required) VALUES (?, ?, ?)`,
                        [id, mat.item_id, mat.quantity_required]
                    );
                }
            }
        }

        await conn.commit();
        auditLog(pool, { tableName: 'product_catalog', recordId: id, action: 'UPDATE', oldValues: old[0], newValues: { name, image_url }, userId: req.user.id, req });
        res.json({ message: 'Producto actualizado exitosamente.' });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally { conn.release(); }
};

const remove = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const { id } = req.params;
        const [old] = await conn.query('SELECT * FROM product_catalog WHERE id = ?', [id]);
        if (!old.length) return res.status(404).json({ error: 'Producto no encontrado.' });

        await conn.query('DELETE FROM product_catalog WHERE id = ?', [id]);

        // Delete image file natively
        if (old[0].image_url) {
            const oldPath = path.join(__dirname, '../../', old[0].image_url);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        auditLog(conn, { tableName: 'product_catalog', recordId: id, action: 'DELETE', oldValues: old[0], userId: req.user.id, req });
        res.json({ message: 'Producto eliminado exitosamente.' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ error: 'No se puede eliminar el producto porque tiene listas de materiales (BOM) o órdenes de producción asociadas. Desactívelo en su lugar.' });
        }
        next(err);
    } finally {
        conn.release();
    }
};

module.exports = { getAll, getById, create, update, remove };
