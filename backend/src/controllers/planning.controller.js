const { pool } = require('../db/connection');

const getPlanningStats = async (req, res, next) => {
    try {
        // 1. Planificación de Producción del Día Siguiente
        // Busca órdenes con prioridad URGENT o HIGH y piezas en etapas iniciales
        const [dailyPlan] = await pool.query(`
            SELECT pod.product_id, pc.name as product_name, SUM(pod.quantity) as total_quantity
            FROM production_order_details pod
            JOIN production_orders po ON pod.order_id = po.id
            JOIN product_catalog pc ON pod.product_id = pc.id
            WHERE po.status IN ('PENDING_MATERIAL', 'IN_PROGRESS')
              AND pod.stage IN ('DESIGN', 'PENDING_MATERIAL', 'CUTTING')
            GROUP BY pod.product_id
            ORDER BY total_quantity DESC
            LIMIT 20
        `);

        // 2. Planificación de Compras Mensual Proyectada
        // BASADO en el BOM (product_materials) de todas las órdenes Activas/Pendientes
        const [purchasePlan] = await pool.query(`
            SELECT ii.id as material_id, ii.name as material_name, mc.unit_of_measure,
                   SUM(pod.quantity * pm.quantity_required) as required_quantity,
                   MAX(ii.quantity_available) as current_stock
            FROM production_order_details pod
            JOIN production_orders po ON pod.order_id = po.id
            JOIN product_materials pm ON pod.product_id = pm.product_id
            JOIN inventory_items ii ON pm.item_id = ii.id
            JOIN material_categories mc ON ii.category_id = mc.id
            WHERE po.status NOT IN ('DELIVERED', 'CANCELLED', 'READY_FOR_DELIVERY')
            GROUP BY ii.id
            ORDER BY required_quantity DESC
        `);

        // Calcular déficit
        const projectedPurchases = purchasePlan.map(item => ({
            ...item,
            deficit: (item.required_quantity > item.current_stock) ? (item.required_quantity - item.current_stock) : 0
        }));

        res.json({ dailyPlan, projectedPurchases });
    } catch (err) { next(err); }
};

module.exports = { getPlanningStats };
