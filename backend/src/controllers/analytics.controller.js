const { pool } = require('../db/connection');

// GET /api/analytics/operator-stats
const getOperatorStats = async (req, res, next) => {
    try {
        const query = `
            SELECT 
                performed_by as user_id, 
                operator_name as name, 
                operator_role as role, 
                COUNT(DISTINCT order_detail_id) as orders_worked,
                SUM(quantity_passed) as total_produced,
                SUM(IF(quantity_requested > quantity_passed, quantity_requested - quantity_passed, 0)) as total_damaged
            FROM production_stage_log
            WHERE operator_role IS NOT NULL AND operator_role != ''
            GROUP BY performed_by, operator_name, operator_role
            ORDER BY operator_role, total_produced DESC;
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (err) { 
        next(err); 
    }
};

module.exports = { getOperatorStats };
