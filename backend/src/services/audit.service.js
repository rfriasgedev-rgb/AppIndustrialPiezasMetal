const { pool } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

const auditLog = async (poolOrConn, { tableName, recordId, action, oldValues, newValues, userId, req }) => {
    try {
        await poolOrConn.query(
            `INSERT INTO audit_log (id, table_name, record_id, action, old_values, new_values, performed_by, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                uuidv4(),
                tableName,
                recordId,
                action,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                userId || null,
                req?.ip || null,
                req?.headers?.['user-agent'] || null,
            ]
        );
    } catch (err) {
        console.error('[AuditLog] Error al registrar auditoría:', err.message);
    }
};

module.exports = { auditLog };
