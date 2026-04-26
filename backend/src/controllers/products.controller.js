const { pool } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { auditLog } = require('../services/audit.service');

const getAll = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT p.id, p.name, p.part_number, p.description, p.requires_assembly, p.standard_hours, p.sale_price, p.image_url, p.is_active, p.created_at,
                    u.abbreviation as unit_measure
             FROM product_catalog p
             LEFT JOIN measurement_units u ON p.unit_of_measure_id = u.id
             ORDER BY p.name LIMIT 1000`
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
        const { name, part_number, description, requires_assembly, standard_hours, sale_price, image_data, unit_of_measure_id } = req.body;
        if (!name) {
            await conn.rollback();
            return res.status(400).json({ error: 'El nombre del producto es requerido.' });
        }

        let materials = [];
        if (req.body.materials) {
            try {
                materials = typeof req.body.materials === 'string' ? JSON.parse(req.body.materials) : req.body.materials;
            } catch (e) { /* ignore */ }
        }

        // image_data llega como string base64 (data:image/...;base64,...)
        const image_url = image_data || null;

        const id = uuidv4();
        await conn.query(
            `INSERT INTO product_catalog (id, name, part_number, description, requires_assembly, standard_hours, sale_price, image_url, unit_of_measure_id) 
       VALUES (?,?,?,?,?,?,?,?,?)`,
            [id, name, part_number, description, String(requires_assembly) === 'true' || String(requires_assembly) === '1' ? 1 : 0, standard_hours || 0, sale_price || 0, image_url, unit_of_measure_id || null]
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
        auditLog(pool, { tableName: 'product_catalog', recordId: id, action: 'INSERT', newValues: { name, part_number }, userId: req.user.id, req });
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

        const { name, part_number, description, requires_assembly, standard_hours, sale_price, is_active, image_data, unit_of_measure_id } = req.body;

        let materials = [];
        if (req.body.materials) {
            try {
                materials = typeof req.body.materials === 'string' ? JSON.parse(req.body.materials) : req.body.materials;
            } catch (e) { /* ignore */ }
        }

        // Si viene image_data nueva la usamos; si viene null explícito borramos; si no viene, conservamos la anterior
        let image_url = old[0].image_url;
        if (req.body.hasOwnProperty('image_data')) {
            image_url = image_data || null;
        }

        await conn.query(
            `UPDATE product_catalog SET name=?, part_number=?, description=?, requires_assembly=?, standard_hours=?, sale_price=?, image_url=?, is_active=?, unit_of_measure_id=? WHERE id=?`,
            [
                name ?? old[0].name,
                part_number ?? old[0].part_number,
                description ?? old[0].description,
                requires_assembly !== undefined ? (String(requires_assembly) === 'true' || String(requires_assembly) === '1' ? 1 : 0) : old[0].requires_assembly,
                standard_hours ?? old[0].standard_hours,
                sale_price ?? old[0].sale_price,
                image_url,
                is_active !== undefined ? (String(is_active) === 'true' || String(is_active) === '1' ? 1 : 0) : old[0].is_active,
                unit_of_measure_id ?? old[0].unit_of_measure_id,
                id
            ]
        );

        // Actualizar Lista de Materiales (BOM)
        if (req.body.materials !== undefined) {
            await conn.query('DELETE FROM product_materials WHERE product_id = ?', [id]);
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
        auditLog(pool, { tableName: 'product_catalog', recordId: id, action: 'UPDATE', oldValues: { name: old[0].name }, newValues: { name }, userId: req.user.id, req });
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

        auditLog(conn, { tableName: 'product_catalog', recordId: id, action: 'DELETE', oldValues: { name: old[0].name }, userId: req.user.id, req });
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
