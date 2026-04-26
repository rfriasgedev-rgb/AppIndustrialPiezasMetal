const { pool } = require('../db/connection');

// GET /api/analytics/operator-stats
const getOperatorStats = async (req, res, next) => {
    try {
        const query = `
            SELECT 
                pslt.employee_name as name, 
                pslt.employee_role as role, 
                COUNT(DISTINCT psl.order_detail_id) as orders_worked,
                SUM(psl.quantity_passed) as total_produced,
                SUM(IF(psl.quantity_requested > psl.quantity_passed, psl.quantity_requested - psl.quantity_passed, 0)) as total_damaged
            FROM production_stage_log_team pslt
            JOIN production_stage_log psl ON pslt.production_stage_log_id = psl.id
            WHERE pslt.employee_role IS NOT NULL AND pslt.employee_role != ''
            GROUP BY pslt.employee_name, pslt.employee_role
            ORDER BY pslt.employee_role, total_produced DESC;
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (err) { 
        next(err); 
    }
};

module.exports = { getOperatorStats };
