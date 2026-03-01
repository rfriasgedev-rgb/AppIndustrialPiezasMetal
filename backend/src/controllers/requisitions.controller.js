const { pool } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');

// Generar o Recuperar una Requisición de una OP
const generateRequisition = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { orderId } = req.params;

        // 1. Validar orden
        const [orders] = await conn.query('SELECT * FROM production_orders WHERE id = ? FOR UPDATE', [orderId]);
        if (!orders.length) {
            await conn.rollback();
            return res.status(404).json({ error: 'Orden de Producción no encontrada.' });
        }
        const order = orders[0];

        if (order.status === 'CANCELLED' || order.status === 'DRAFT') {
            await conn.rollback();
            return res.status(400).json({ error: 'La orden debe estar activa para generar requisición.' });
        }

        // 2. Revisar si ya existe requisición
        const [existing] = await conn.query('SELECT * FROM material_requisitions WHERE production_order_id = ? FOR UPDATE', [orderId]);
        if (existing.length > 0) {
            await conn.commit();
            return res.status(200).json({
                message: 'Ya existe una requisición.',
                requisitionId: existing[0].id,
                existing: true
            });
        }

        // 3. Obtener el BOM consolidado multiplicando detalles de la orden
        // OP -> ProductionOrderDetails (Qty a Producir) -> Product_Materials (Qty Receta)
        const [bomCalc] = await conn.query(`
            SELECT 
                pm.item_id, 
                SUM(pm.quantity_required * pod.quantity) as total_required
            FROM production_order_details pod
            JOIN product_materials pm ON pod.product_id = pm.product_id
            WHERE pod.order_id = ?
            GROUP BY pm.item_id
        `, [orderId]);

        if (!bomCalc.length) {
            await conn.rollback();
            return res.status(400).json({ error: 'Ninguno de los productos a fabricar tiene un BOM (Lista de Materiales). No hay insumos que solicitar.' });
        }

        // 4. Generar Cabecera de Requisición
        const requisitionId = uuidv4();
        // Obtener un número secuencial sencillo para requisition_number
        const [countRes] = await conn.query('SELECT COUNT(*) as c FROM material_requisitions');
        const reqNumber = `REQ-2026-${String(countRes[0].c + 1).padStart(5, '0')}`;

        await conn.query(`
            INSERT INTO material_requisitions (id, requisition_number, production_order_id, status, requested_by)
            VALUES (?, ?, ?, 'PENDING', ?)
        `, [requisitionId, reqNumber, orderId, req.user.id]);

        // 5. Inyectar Detalles Calculados
        for (const item of bomCalc) {
            await conn.query(`
                INSERT INTO requisition_details (id, requisition_id, item_id, quantity_requested, quantity_dispatched)
                VALUES (?, ?, ?, ?, 0)
            `, [uuidv4(), requisitionId, item.item_id, item.total_required]);
        }

        // Cambiar la OP a estado de espera si no está ya en progreso
        if (order.status !== 'IN_PROGRESS') {
            await conn.query('UPDATE production_orders SET status = ? WHERE id = ?', ['PENDING_MATERIAL', orderId]);
        }

        await conn.commit();
        res.status(201).json({ message: 'Requisición generada exitosamente.', requisitionId });

    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

// Obtener Requisición por OP
const getByOrderId = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT id, requisition_number, status, created_at FROM material_requisitions WHERE production_order_id = ?', [req.params.orderId]);
        res.json(rows[0] || null);
    } catch (err) { next(err); }
};

// Endpoint PDF (Imprimiendo en Al vuelo en res.pipe)
const generateRequisitionPDF = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Fetch Requisición y Header
        const [reqHeader] = await pool.query(`
            SELECT r.*, po.order_number, po.client_id, c.company_name, u.full_name 
            FROM material_requisitions r
            JOIN production_orders po ON r.production_order_id = po.id
            LEFT JOIN clients c ON po.client_id = c.id
            JOIN users u ON r.requested_by = u.id
            WHERE r.id = ?
        `, [id]);

        if (!reqHeader.length) return res.status(404).json({ error: 'Requisición no encontrada' });
        const data = reqHeader[0];

        // Fetch de los productos que se fabrican en esta OP para añadir al Header
        const [productsToProduce] = await pool.query(`
            SELECT pod.quantity, pc.name as product_name
            FROM production_order_details pod
            JOIN product_catalog pc ON pod.product_id = pc.id
            WHERE pod.order_id = ?
        `, [data.production_order_id]);

        // Fetch Detalles y unirlos con items e inventario
        const [details] = await pool.query(`
            SELECT 
                rd.quantity_requested, 
                i.name as item_name, 
                i.sku as part_number,
                cat.unit_of_measure,
                i.location
            FROM requisition_details rd
            JOIN inventory_items i ON rd.item_id = i.id
            JOIN material_categories cat ON i.category_id = cat.id
            WHERE rd.requisition_id = ?
            ORDER BY i.name
        `, [id]);

        // Build PDF
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Requisicion_${data.requisition_number}.pdf"`);
        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Requisición de Materiales - Almacén', { align: 'center' });
        doc.moveDown();

        doc.fontSize(10).text(`No. Requisición: ${data.requisition_number}`, { continued: true });
        doc.text(`   |   Fecha: ${new Date(data.created_at).toLocaleString()}`);
        doc.text(`Generada por: ${data.full_name}`);
        doc.moveDown();

        doc.fontSize(12).font('Helvetica-Bold').text(`> Orden de Producción Relacionada: ${data.order_number}`);

        doc.fontSize(10).font('Helvetica-Oblique').text('Para Producir:');
        productsToProduce.forEach(p => {
            doc.text(`  • ${p.product_name}    - Cant. ${parseFloat(p.quantity)} piezas`);
        });

        doc.moveDown(0.5);
        doc.font('Helvetica').text(`Cliente de OP: ${data.company_name || 'N/A'}`);
        doc.text(`Estado Requisición: ${data.status}`);

        doc.moveDown(2);

        // Table Header
        const startY = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Código/SKU', 50, startY);
        doc.text('Material / Insumo', 150, startY);
        doc.text('Ubicación', 380, startY);
        doc.text('Cant. Req.', 480, startY);

        doc.moveTo(50, startY + 15).lineTo(550, startY + 15).stroke();

        doc.font('Helvetica');
        let currentY = startY + 20;

        // Table Rows
        details.forEach(row => {
            if (currentY > 700) {
                doc.addPage();
                currentY = 50;
            }
            doc.text(row.part_number || 'N/A', 50, currentY, { width: 90 });
            doc.text(row.item_name, 150, currentY, { width: 220 });
            doc.text(row.location || 'N/A', 380, currentY, { width: 90 });
            doc.text(`${parseFloat(row.quantity_requested).toFixed(2)} ${row.unit_of_measure}`, 480, currentY, { width: 70 });

            currentY += 25;
            doc.moveTo(50, currentY - 5).lineTo(550, currentY - 5).strokeColor('#eeeeee').stroke();
            doc.strokeColor('black'); // reset
        });

        // Espacio equivalente a "10 líneas" (aprox 120-150 pts dependiendo del tamaño de fuente)
        currentY += 140;

        // Si el salto de 10 líneas excede el límite de la página, creamos una nueva para las firmas
        if (currentY + 50 > 750) {
            doc.addPage();
            currentY = 150;
        }

        // Firma 1: Despachado Por (Izquierda)
        doc.moveTo(60, currentY).lineTo(260, currentY).stroke();
        doc.text('Despachado Por', 60, currentY + 10, { width: 200, align: 'center' });

        // Firma 2: Recibido Por (Derecha)
        doc.moveTo(340, currentY).lineTo(540, currentY).stroke();
        doc.text('Recibido Por', 340, currentY + 10, { width: 200, align: 'center' });

        doc.end();

    } catch (err) {
        next(err);
    }
};

module.exports = {
    generateRequisition,
    getByOrderId,
    generateRequisitionPDF
};
