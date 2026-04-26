const { pool } = require('../db/connection');

// GET /api/analytics/operator-stats
const getOperatorStats = async (req, res, next) => {
    try {
        const query = `
            SELECT 
                operator_name as name, 
                from_status as role, 
                COUNT(DISTINCT order_detail_id) as orders_worked,
                SUM(quantity_passed) as total_produced,
                SUM(IF(quantity_requested > quantity_passed, quantity_requested - quantity_passed, 0)) as total_damaged
            FROM production_stage_log
            WHERE from_status IN ('DESIGN', 'CUTTING', 'BENDING', 'ASSEMBLY', 'WELDING', 'CLEANING')
              AND operator_name IS NOT NULL
            GROUP BY operator_name, from_status
            ORDER BY total_produced DESC;
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (err) { 
        next(err); 
    }
};

module.exports = { getOperatorStats };
