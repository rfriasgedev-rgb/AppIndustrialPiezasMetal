const { pool } = require('../db/connection');

const getStats = async (req, res, next) => {
    try {
        const [[ordersStats]] = await pool.query(
            `SELECT COUNT(*) as total,
       SUM(status NOT IN ('DELIVERED','CANCELLED')) as active,
       SUM(status = 'DELIVERED') as delivered,
       SUM(status = 'CANCELLED') as cancelled
       FROM production_orders`
        );
        const [ordersByStatus] = await pool.query(
            `SELECT status, COUNT(*) as count FROM production_orders GROUP BY status`
        );
        
        // [NUEVO] - Breakdown por Etapas de Piezas Individuales (Work Queue)
        const [itemsByStage] = await pool.query(
            `SELECT stage, COUNT(*) as count FROM production_order_details GROUP BY stage`
        );
        const [[inventoryAlerts]] = await pool.query(
            `SELECT COUNT(*) as low_stock FROM inventory_items WHERE quantity_available <= reorder_point AND is_active = 1`
        );

        // [NUEVO] - Costo Total y Conteo de Materiales
        const [[inventoryStats]] = await pool.query(
            `SELECT COUNT(*) as total_items, SUM(quantity_available * unit_cost) as total_value 
             FROM inventory_items WHERE is_active = 1`
        );

        // [NUEVO] - Top 5 Materiales Críticos (Bajo Stock) para BarChart
        const [criticalMaterials] = await pool.query(
            `SELECT name, quantity_available, reorder_point, quantity_reserved
             FROM inventory_items 
             WHERE quantity_available <= reorder_point AND is_active = 1
             ORDER BY quantity_available ASC LIMIT 5`
        );

        const [[clientsCount]] = await pool.query('SELECT COUNT(*) as total FROM clients WHERE is_active = 1');

        const [recentOrders] = await pool.query(
            `SELECT po.order_number, po.status, po.priority, c.company_name as client_name, po.created_at
       FROM production_orders po JOIN clients c ON po.client_id = c.id
       ORDER BY po.created_at DESC LIMIT 5`
        );
        res.json({
            orders: ordersStats,
            ordersByStatus,
            itemsByStage,
            inventoryAlerts: inventoryAlerts.low_stock,
            inventoryTotalItems: inventoryStats.total_items,
            inventoryTotalValue: inventoryStats.total_value || 0,
            criticalMaterials,
            totalClients: clientsCount.total,
            recentOrders,
        });
    } catch (err) { next(err); }
};

module.exports = { getStats };
