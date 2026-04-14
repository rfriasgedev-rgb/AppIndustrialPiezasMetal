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

// ENDPOINT DE EMERGENCIA: Añade columnas operator_name/operator_role y tabla _team si faltan
exports.fixAll = async (req, res) => {
    const results = [];
    const run = async (label, sql) => {
        try {
            await pool.query(sql);
            results.push({ label, status: 'OK' });
        } catch (e) {
            // Ignorar si la columna/restricción ya existe (errno 1060, 1061, 1050)
            if ([1060, 1061, 1050].includes(e.errno)) {
                results.push({ label, status: 'YA EXISTIA', detail: e.message });
            } else {
                results.push({ label, status: 'ERROR', detail: e.message });
            }
        }
    };

    // 1. Columnas de snapshot de operador en production_stage_log
    await run(
        'ADD operator_name',
        `ALTER TABLE production_stage_log ADD COLUMN operator_name VARCHAR(150) NULL`
    );
    await run(
        'ADD operator_role',
        `ALTER TABLE production_stage_log ADD COLUMN operator_role VARCHAR(100) NULL`
    );

    // 2. Tabla de snapshot del equipo de línea de producción
    await run(
        'CREATE production_stage_log_team',
        `CREATE TABLE IF NOT EXISTS production_stage_log_team (
            id CHAR(36) NOT NULL PRIMARY KEY,
            production_stage_log_id CHAR(36) NOT NULL,
            employee_name VARCHAR(150) NOT NULL,
            employee_role VARCHAR(100),
            CONSTRAINT fk_log_team FOREIGN KEY (production_stage_log_id)
                REFERENCES production_stage_log(id) ON DELETE CASCADE
        ) ENGINE=InnoDB`
    );

    // 3. ENUM de stage en production_order_details (idempotente, por si acaso)
    await run(
        'MODIFY stage ENUM',
        `ALTER TABLE production_order_details MODIFY COLUMN stage ENUM(
            'DESIGN','PENDING_MATERIAL','CUTTING','BENDING','ASSEMBLY',
            'WELDING','CLEANING','PAINTING','QUALITY_CHECK','READY','CANCELLED'
        ) NOT NULL DEFAULT 'DESIGN'`
    );

    // Verificación del estado final
    const [stageCols] = await pool.query(`SHOW COLUMNS FROM production_stage_log WHERE Field IN ('operator_name','operator_role')`);
    const [teamTable] = await pool.query(`SHOW TABLES LIKE 'production_stage_log_team'`);

    res.json({
        success: true,
        results,
        verification: {
            operator_columns: stageCols.map(c => c.Field),
            team_table_exists: teamTable.length > 0,
        }
    });
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
