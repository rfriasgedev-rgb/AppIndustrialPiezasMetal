require('dotenv').config({ path: '../.env' });
const { pool } = require('./db/connection');
const { v4: uuidv4 } = require('uuid');

async function run() {
    let conn;
    try {
        console.log('1. Connecting to DB...');
        conn = await pool.getConnection();

        console.log('2. Starting transaction...');
        await conn.beginTransaction();

        const orderId = '0f5e2b76-5c07-44fa-a320-f59ee80dbdf0'; // ID de la OP-0001

        console.log('3. Validando orden...');
        const [orders] = await conn.query('SELECT * FROM production_orders WHERE id = ? FOR UPDATE', [orderId]);
        if (!orders.length) throw new Error('Orden no encontrada');
        const order = orders[0];

        console.log('4. Revisando si ya existe req...');
        const [existing] = await conn.query('SELECT * FROM material_requisitions WHERE production_order_id = ? FOR UPDATE', [orderId]);
        if (existing.length > 0) throw new Error('Ya existe req');

        console.log('5. Calculando BOM...');
        const [bomCalc] = await conn.query(`
            SELECT 
                pm.item_id, 
                SUM(pm.quantity_required * pod.quantity) as total_required
            FROM production_order_details pod
            JOIN product_materials pm ON pod.product_id = pm.product_id
            WHERE pod.order_id = ?
            GROUP BY pm.item_id
        `, [orderId]);

        console.log(bomCalc);

        if (!bomCalc.length) throw new Error('Sin BOM');

        const requisitionId = uuidv4();
        const [countRes] = await conn.query('SELECT COUNT(*) as c FROM material_requisitions');
        const reqNumber = `REQ-2026-${String(countRes[0].c + 1).padStart(5, '0')}`;

        console.log('6. Insercion de la cabecera...');

        const [users] = await conn.query("SELECT id FROM users LIMIT 1");
        const reqUser = users[0].id;

        await conn.query(`
            INSERT INTO material_requisitions (id, requisition_number, production_order_id, status, requested_by)
            VALUES (?, ?, ?, 'PENDING', ?)
        `, [requisitionId, reqNumber, orderId, reqUser]);

        console.log('7. Insercion de detalles...');
        for (const item of bomCalc) {
            await conn.query(`
                INSERT INTO requisition_details (id, requisition_id, item_id, quantity_requested, quantity_dispatched)
                VALUES (?, ?, ?, ?, 0)
            `, [uuidv4(), requisitionId, item.item_id, item.total_required]);
        }

        console.log('Update OP...');
        if (order.status !== 'IN_PROGRESS') {
            await conn.query('UPDATE production_orders SET status = ? WHERE id = ?', ['PENDING_MATERIAL', orderId]);
        }

        await conn.commit();
        console.log('FINALIZADO OK');
    } catch (e) {
        console.error('SERVER CRASH:', e);
        if (conn) await conn.rollback();
    } finally {
        if (conn) await conn.end();
    }
}
run();
