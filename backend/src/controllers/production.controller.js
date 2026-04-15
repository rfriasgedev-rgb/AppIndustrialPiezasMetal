const { pool } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { auditLog } = require('../services/audit.service');

// Estado de máquina finita para el flujo de producción por PIEZA
const TRANSITIONS = {
    DESIGN: ['CUTTING', 'CANCELLED'],
    CUTTING: ['BENDING', 'CANCELLED'],
    BENDING: ['ASSEMBLY', 'WELDING', 'CLEANING', 'CANCELLED'],
    ASSEMBLY: ['WELDING', 'CLEANING', 'CANCELLED'],
    WELDING: ['CLEANING', 'CANCELLED'],
    CLEANING: ['READY', 'CANCELLED'],
    READY: [],
    CANCELLED: [],
};

// GET /production - Listar órdenes (Nivel Cabecera con Avance Global)
const getAll = async (req, res, next) => {
    try {
        const { status, client_id, stage, search, date_from, date_to } = req.query;
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
        if (status)    { query += ' AND po.status = ?';    params.push(status); }
        if (client_id) { query += ' AND po.client_id = ?'; params.push(client_id); }
        // Filtrar por etapa de pieza (igual que My Station)
        if (stage) {
            query += ' AND EXISTS (SELECT 1 FROM production_order_details pod WHERE pod.order_id = po.id AND pod.stage = ?)';
            params.push(stage);
        }
        // Búsqueda por número de orden o nombre de cliente
        if (search) {
            query += ' AND (po.order_number LIKE ? OR c.company_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        // Filtro por rango de fechas de creación
        if (date_from) { query += ' AND DATE(po.created_at) >= ?'; params.push(date_from); }
        if (date_to)   { query += ' AND DATE(po.created_at) <= ?'; params.push(date_to); }

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
            const initialStage = item.is_new ? 'DESIGN' : 'CUTTING';
            
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
        const { to_status, notes, production_line_id } = req.body;

        const [userRows] = await conn.query(
            'SELECT u.full_name, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?', 
            [req.user.id]
        );
        const operatorName = userRows[0]?.full_name || 'Desconocido';
        const operatorRole = userRows[0]?.role_name || '';

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

        // Validate production_line_id if finishing production
        if (to_status === 'READY' && !production_line_id) {
            await conn.rollback();
            return res.status(400).json({ error: 'Debe seleccionar una línea de producción que realizó el empaque y envío.' });
        }

        // Marcar etapa log anterior como completada
        await conn.query(
            `UPDATE production_stage_log SET stage_completed_at = NOW() WHERE order_detail_id = ? AND stage_completed_at IS NULL`,
            [id]
        );

        // Actualizar stage en el Detail (y linea de produccion si aplica)
        if (production_line_id) {
            await conn.query('UPDATE production_order_details SET stage = ?, production_line_id = ?, updated_at = NOW() WHERE id = ?', [to_status, production_line_id, id]);
        } else {
            await conn.query('UPDATE production_order_details SET stage = ?, updated_at = NOW() WHERE id = ?', [to_status, id]);
        }

        // Insertar nuevo Log con snapshot de operador
        const logId = uuidv4();
        await conn.query(
            `INSERT INTO production_stage_log (id, order_detail_id, from_status, to_status, notes, performed_by, operator_name, operator_role) VALUES (?,?,?,?,?,?,?,?)`,
            [logId, id, detail.stage, to_status, notes, req.user.id, operatorName, operatorRole]
        );

        // Snapshot del equipo de la Línea de Producción si aplica
        if (to_status === 'READY' && production_line_id) {
            const [lineEmployees] = await conn.query(`
                SELECT e.first_name, e.last_name, er.name as role_name 
                FROM production_line_employees ple
                JOIN employees e ON ple.employee_id = e.id
                LEFT JOIN employee_roles er ON e.employee_role_id = er.id
                WHERE ple.line_id = ?
            `, [production_line_id]);

            if (lineEmployees.length > 0) {
                const teamValues = lineEmployees.map(emp => [
                    uuidv4(), logId, `${emp.first_name} ${emp.last_name}`, emp.role_name || ''
                ]);
                await conn.query(
                    `INSERT INTO production_stage_log_team (id, production_stage_log_id, employee_name, employee_role) VALUES ?`,
                    [teamValues]
                );
            }
        }

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
