const { pool } = require('../db/connection');
const fs = require('fs');
const path = require('path');

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
