const { pool } = require('../db/connection');
const fs = require('fs');
const path = require('path');

// ENDPOINT DE EMERGENCIA: Aplica el ALTER TABLE del ENUM directamente en la DB live
exports.fixStageEnum = async (req, res) => {
    try {
        await pool.query(`
            ALTER TABLE production_order_details
            MODIFY COLUMN stage ENUM(
                'DESIGN',
                'PENDING_MATERIAL',
                'CUTTING',
                'BENDING',
                'ASSEMBLY',
                'WELDING',
                'CLEANING',
                'PAINTING',
                'QUALITY_CHECK',
                'READY',
                'CANCELLED'
            ) NOT NULL DEFAULT 'DESIGN'
        `);

        // Verificar el resultado
        const [cols] = await pool.query(`SHOW COLUMNS FROM production_order_details WHERE Field = 'stage'`);
        res.json({ 
            success: true, 
            message: 'ENUM de stage actualizado correctamente.',
            column: cols[0]
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getDbStatus = async (req, res) => {
    try {
        const results = {};
        
        // 1. Leer archivos de controladores vivos
        const controllers = ['departments', 'employees', 'schedules', 'employee_roles'];
        results.files = {};
        
        for (const ctrl of controllers) {
            const p = path.join(__dirname, `./${ctrl}.controller.js`);
            results.files[ctrl] = fs.existsSync(p) 
                ? fs.readFileSync(p, 'utf8').substring(0, 1500) 
                : 'NO ENCONTRADO';
        }

        // 2. Esquema de tablas de personal
        results.schemas = {};
        const tables = ['departments', 'shifts', 'employee_roles', 'employees'];
        for (const t of tables) {
            try {
                const [schema] = await pool.query(`DESCRIBE ${t}`);
                results.schemas[t] = schema;
            } catch (e) {
                results.schemas[t] = 'ERROR: ' + e.message;
            }
        }

        res.json({
            status: 'Deep Diagnostic Report',
            server_time: new Date().toISOString(),
            ...results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
