const { pool } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

exports.getDbStatus = async (req, res) => {
    try {
        const results = {};
        
        // 1. Prueba de INSERT real en departments
        try {
            const testId = uuidv4();
            await pool.query('INSERT INTO departments (id, name, description) VALUES (?, ?, ?)', 
                [testId, 'DEBUG_TEST_' + Date.now(), 'Prueba técnica']);
            results.insert_test = '✅ ÉXITO: Inserción completada.';
        } catch (err) {
            results.insert_test = `❌ FALLO: ${err.message} (Code: ${err.code})`;
        }

        // 2. Esquema real
        const [schema] = await pool.query('DESCRIBE departments');
        results.schema = schema;

        // 3. Log de migración
        results.migration_log = global.migrationResults || 'No log';

        res.json({
            status: 'Diagnostic Result',
            server_time: new Date().toISOString(),
            ...results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
