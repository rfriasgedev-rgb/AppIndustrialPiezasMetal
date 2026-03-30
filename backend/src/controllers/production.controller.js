const { pool } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { auditLog } = require('../services/audit.service');

// Estado de máquina finita para el flujo de producción por PIEZA
const TRANSITIONS = {
    DESIGN: ['PENDING_MATERIAL', 'CANCELLED'],
    PENDING_MATERIAL: ['CUTTING', 'CANCELLED'],
    CUTTING: ['BENDING', 'CANCELLED'],
    BENDING: ['ASSEMBLY', 'WELDING', 'CLEANING', 'CANCELLED'],  // ASSEMBLY o WELDING dependiendo de la pieza
    ASSEMBLY: ['WELDING', 'CLEANING', 'CANCELLED'],
    WELDING: ['CLEANING', 'CANCELLED'],
    CLEANING: ['PAINTING', 'CANCELLED'],
    PAINTING: ['QUALITY_CHECK', 'CANCELLED'],
    QUALITY_CHECK: ['READY', 'CUTTING', 'PAINTING'],  // puede regresar a re-proceso
    READY: [],
    CANCELLED: [],
};

// GET /production - Listar órdenes (Nivel Cabecera con Avance Global)
const getAll = async (req, res, next) => {
    try {
        const { status, client_id } = req.query;
        let query = `
      SELECT po.id, po.order_number, po.status, po.priority,
             po.estimated_delivery, po.actual_delivery, po.created_at,
             c.company_name as client_name, u.full_name as created_by_name,
             (SELECT COUNT(*) FROM production_order_details WHERE order_id = po.id) as total_items,
             (SELECT COUNT(*) FROM production_order_details WHERE order_id = po.id AND stage = 'READY') as ready_items
      FROM production_orders po
      JOIN clients c ON po.client_id = c.id
      JOIN users u ON po.created_by = u.id
      WHERE 1=1`;
        const params = [];
        if (status) { query += ' AND po.status = ?'; params.push(status); }
        if (client_id) { query += ' AND po.client_id = ?'; params.push(client_id); }
        query += ' ORDER BY FIELD(po.priority,"URGENT","HIGH","NORMAL","LOW"), po.created_at DESC LIMIT 1000';
        const [rows] = await pool.query(query, params);

        // Calcular porcentaje al vuelo
        const processed = rows.map(r => ({
            ...r,
            progress: r.total_items > 0 ? Math.round((r.ready_items / r.total_items) * 100) : 0
        }));

        res.json(processed);
    } catch (err) { next(err); }
};

// GET /production/:id - Detalle Anidado (Order -> Items -> Logs)
const getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [[order]] = await pool.query(
            `SELECT po.*, c.company_name as client_name
       FROM production_orders po JOIN clients c ON po.client_id = c.id
       WHERE po.id = ?`, [id]
        );
        if (!order) return res.status(404).json({ error: 'Orden no encontrada.' });

        // Obtener hijos (items)
        const [items] = await pool.query(
            `SELECT pod.*, pc.name as product_name, pc.part_number
             FROM production_order_details pod
             JOIN product_catalog pc ON pod.product_id = pc.id
             WHERE pod.order_id = ?`, [id]
        );

        // Obtener Logs mapeados por item
        const [logs] = await pool.query(
            `SELECT sl.*, u.full_name as performed_by_name FROM production_stage_log sl
             JOIN production_order_details pod ON sl.order_detail_id = pod.id
             LEFT JOIN users u ON sl.performed_by = u.id 
             WHERE pod.order_id = ? ORDER BY sl.stage_started_at DESC`, [id]
        );

        res.json({ ...order, items, all_logs: logs });
    } catch (err) { next(err); }
};

// POST /production - Crear orden de producción Multi-Item
const create = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { client_id, priority, estimated_delivery, notes, items } = req.body;

        if (!client_id || !items || !items.length) {
            return res.status(400).json({ error: 'Cliente y al menos un producto son requeridos.' });
        }

        // Generar número de orden único
        const [[countRow]] = await conn.query('SELECT COUNT(*) as cnt FROM production_orders');
        const orderNumber = `OP-${new Date().getFullYear()}-${String(countRow.cnt + 1).padStart(5, '0')}`;
        const id = uuidv4();

        // 1. Cabecera
        await conn.query(
            `INSERT INTO production_orders (id, order_number, client_id, priority, estimated_delivery, notes, created_by, status)
             VALUES (?,?,?,?,?,?,?,?)`,
            [id, orderNumber, client_id, priority || 'NORMAL', estimated_delivery, notes, req.user.id, 'IN_PROGRESS'] // En Master-Detail nace directo en In_Progress
        );

        // 2. Insertar Detalles (Items) iterativamente
        for (const item of items) {
            const detailId = uuidv4();
            const initialStage = item.is_new ? 'DESIGN' : 'PENDING_MATERIAL';
            
            await conn.query(
                `INSERT INTO production_order_details (id, order_id, product_id, quantity, requires_assembly, notes, stage) 
                 VALUES (?,?,?,?,?,?,?)`,
                [detailId, id, item.product_id, item.quantity || 1, item.requires_assembly ? 1 : 0, item.notes || '', initialStage]
            );

            // 3. Log de Etapa Inicial por Pieza
            await conn.query(
                `INSERT INTO production_stage_log (id, order_detail_id, from_status, to_status, notes, performed_by) VALUES (?,?,?,?,?,?)`,
                [uuidv4(), detailId, null, initialStage, 'Pieza agregada a la orden', req.user.id]
            );
        }

        await conn.commit();
        auditLog(pool, { tableName: 'production_orders', recordId: id, action: 'INSERT', newValues: { order_number: orderNumber }, userId: req.user.id, req });
        res.status(201).json({ id, order_number: orderNumber, message: 'Orden de producción multi-piezas creada.' });
    } catch (err) { await conn.rollback(); next(err); } finally { conn.release(); }
};

// PUT /production/:id/advance - Avanzar etapa de UNA PIEZA (Detail)
const advanceStage = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        // NOTA: 'id' aquí es el order_detail_id, NO la orden padre.
        const { id } = req.params;
        const { to_status, notes } = req.body;

        const [[detail]] = await conn.query('SELECT * FROM production_order_details WHERE id = ? FOR UPDATE', [id]);
        if (!detail) { await conn.rollback(); return res.status(404).json({ error: 'Item de orden no encontrado.' }); }

        const allowedTransitions = TRANSITIONS[detail.stage] || [];
        if (!allowedTransitions.includes(to_status)) {
            await conn.rollback();
            return res.status(409).json({
                error: `Transición inválida: de '${detail.stage}' a '${to_status}'. Transiciones permitidas: ${allowedTransitions.join(', ')}`
            });
        }

        if (to_status === 'ASSEMBLY' && !detail.requires_assembly) {
            await conn.rollback();
            return res.status(409).json({ error: 'Esta pieza no requiere ensamblaje.' });
        }

        // Marcar etapa log anterior como completada
        await conn.query(
            `UPDATE production_stage_log SET stage_completed_at = NOW() WHERE order_detail_id = ? AND stage_completed_at IS NULL`,
            [id]
        );

        // Actualizar stage en el Detail
        await conn.query('UPDATE production_order_details SET stage = ?, updated_at = NOW() WHERE id = ?', [to_status, id]);

        // Insertar nuevo Log
        await conn.query(
            `INSERT INTO production_stage_log (id, order_detail_id, from_status, to_status, notes, performed_by) VALUES (?,?,?,?,?,?)`,
            [uuidv4(), id, detail.stage, to_status, notes, req.user.id]
        );

        // -- MÁQUINA DE ESTADOS DEL PADRE --
        // Evaluar si TODAS las piezas están listas para marcar la orden padre como Entregada o Preparada.
        const [stats] = await conn.query(`SELECT stage FROM production_order_details WHERE order_id = ?`, [detail.order_id]);
        const allReady = stats.every(s => s.stage === 'READY');
        if (allReady) {
            await conn.query(`UPDATE production_orders SET status = 'READY_FOR_DELIVERY', updated_at = NOW() WHERE id = ?`, [detail.order_id]);
        }

        await conn.commit();
        res.json({ message: `Pieza avanzada a etapa: ${to_status}` });
    } catch (err) { await conn.rollback(); next(err); } finally { conn.release(); }
};

const update = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const { id } = req.params;
        const [old] = await conn.query('SELECT * FROM production_orders WHERE id = ?', [id]);
        if (!old.length) return res.status(404).json({ error: 'Orden no encontrada.' });

        const { priority, estimated_delivery, notes, status } = req.body;

        await conn.query(
            `UPDATE production_orders SET priority=?, estimated_delivery=?, notes=?, status=? WHERE id=?`,
            [
                priority ?? old[0].priority,
                estimated_delivery !== undefined ? estimated_delivery : old[0].estimated_delivery,
                notes ?? old[0].notes,
                status ?? old[0].status,
                id
            ]
        );

        if (status === 'DELIVERED') {
            await conn.query('UPDATE production_orders SET actual_delivery = CURDATE() WHERE id = ?', [id]);
        }
        res.json({ message: 'Orden (Padre) actualizada exitosamente.' });
    } catch (err) { next(err); } finally { conn.release(); }
};

const remove = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const [old] = await conn.query('SELECT * FROM production_orders WHERE id = ?', [id]);
        if (!old.length) {
            await conn.rollback();
            return res.status(404).json({ error: 'Orden no encontrada.' });
        }

        // Cascada Delete handles podetails and logs in DB side for us via ON DELETE CASCADE
        await conn.query('DELETE FROM production_orders WHERE id = ?', [id]);

        auditLog(conn, { tableName: 'production_orders', recordId: id, action: 'DELETE', oldValues: old[0], userId: req.user.id, req });
        await conn.commit();
        res.json({ message: 'Orden eliminada integralmente.' });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

// GET /production/queue/:stage - Obtener ítems enológicos en una etapa específica
const getQueue = async (req, res, next) => {
    try {
        const { stage } = req.params;
        const [items] = await pool.query(
            `SELECT pod.*, po.order_number, po.priority, po.created_at as order_date, pc.name as product_name, c.company_name as client_name,
             (SELECT psl.stage_started_at FROM production_stage_log psl WHERE psl.order_detail_id = pod.id AND psl.to_status = pod.stage ORDER BY psl.stage_started_at DESC LIMIT 1) as stage_entered_at
             FROM production_order_details pod
             JOIN production_orders po ON pod.order_id = po.id
             JOIN product_catalog pc ON pod.product_id = pc.id
             JOIN clients c ON po.client_id = c.id
             WHERE pod.stage = ?
             ORDER BY FIELD(po.priority,"URGENT","HIGH","NORMAL","LOW"), po.created_at ASC`,
            [stage.toUpperCase()]
        );
        res.json(items);
    } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, advanceStage, update, remove, getQueue };
