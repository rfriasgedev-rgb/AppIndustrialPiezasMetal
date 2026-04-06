const { pool } = require('../db/connection');
const fs = require('fs');
const path = require('path');

exports.getDbStatus = async (req, res) => {
    try {
        // 1. Listar todas las tablas
        const [tables] = await pool.query('SHOW TABLES');
        
        // 2. Obtener versión de MySQL
        const [version] = await pool.query('SELECT VERSION() as version');
        
        // 3. Verificar archivos físicos en la carpeta db
        const dbDir = path.join(__dirname, '../db');
        let dbFiles = [];
        if (fs.existsSync(dbDir)) {
            dbFiles = fs.readdirSync(dbDir);
        }

        // 4. Ver log de migración (si existe el global)
        const migrationSummary = global.migrationResults || 'Log no inicializado';

        res.json({
            status: 'Diagnostic Report',
            server_time: new Date().toISOString(),
            mysql_version: version[0].version,
            database_name: process.env.DB_NAME || 'Detectado por URI',
            tables_count: tables.length,
            tables_list: tables, 
            physical_db_files: dbFiles,
            migration_log: migrationSummary
        });
    } catch (error) {
        console.error('Error in debug diagnostic:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
};
