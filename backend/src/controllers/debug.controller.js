const { pool } = require('../db/connection');
const fs = require('fs');
const path = require('path');

exports.getDbStatus = async (req, res) => {
    try {
        // 1. Listar todas las tablas
        const [tables] = await pool.query('SHOW TABLES');
        
        // 2. Obtener versión de MySQL
        const [version] = await pool.query('SELECT VERSION() as version');
        
        // 3. Inspeccionar estructura de tablas clave
        const [deptSchema] = await pool.query('DESCRIBE departments');
        const [rolesSchema] = await pool.query('DESCRIBE employee_roles').catch(() => [[]]);
        const [empSchema] = await pool.query('DESCRIBE employees').catch(() => [[]]);
        
        // 4. Leer contenido REAL de los archivos en el servidor
        const deptControllerPath = path.join(__dirname, './departments.controller.js');
        const deptCode = fs.existsSync(deptControllerPath) 
            ? fs.readFileSync(deptControllerPath, 'utf8').substring(0, 1000) // Solo los primeros 1000 caracteres
            : 'ARCHIVO NO ENCONTRADO EN ' + deptControllerPath;

        // 5. Ver log de migración
        const migrationSummary = global.migrationResults || 'Log no inicializado';

        res.json({
            status: 'Diagnostic Report',
            server_time: new Date().toISOString(),
            mysql_version: version[0].version,
            dept_schema: deptSchema,
            roles_schema: rolesSchema,
            emp_schema: empSchema,
            dept_controller_preview: deptCode, // ESTO NOS DIRÁ LA VERDAD
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
