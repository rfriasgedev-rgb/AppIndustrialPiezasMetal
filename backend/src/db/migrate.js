const fs = require('fs');
const path = require('path');
const { pool } = require('./connection');

async function migrate() {
    console.log('🔄 Ejecutando migraciones de base de datos...');
    global.migrationResults = [];
    const log = (msg) => {
        console.log(msg);
        global.migrationResults.push(`[${new Date().toISOString()}] ${msg}`);
    };

    try {
        const connection = pool;
        log('🔌 Conexión al pool establecida para migración.');

        // Helper para ejecutar archivos SQL sentencia por sentencia
        const runSqlFile = async (fileName) => {
            const filePath = path.join(__dirname, fileName);
            if (fs.existsSync(filePath)) {
                log(`📖 Leyendo ${fileName}...`);
                const sqlContent = fs.readFileSync(filePath, 'utf8');
                const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);
                
                log(`🚀 Ejecutando ${statements.length} sentencias de ${fileName}...`);
                for (const statement of statements) {
                    try {
                        await connection.query(statement);
                    } catch (err) {
                        // Ignoramos errores comunes de "ya existe" para permitir re-ejecución
                        if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || 
                            err.code === 'ER_DUP_ENTRY' || err.errno === 1060 || err.errno === 1061 || err.errno === 1062) {
                            // Silencioso para duplicados
                        } else {
                            log(`⚠️ Sentencia fallida en ${fileName}: ${err.message}`);
                        }
                    }
                }
            } else {
                log(`❌ Archivo NO ENCONTRADO: ${fileName} en ruta ${filePath}`);
            }
        };

        // 1. Ejecutar schema básico
        await runSqlFile('schema.sql');

        // 2-5. Ejecutar parches acumulados
        await runSqlFile('schema_units_patch.sql');
        await runSqlFile('schema_requisitions_patch.sql');
        await runSqlFile('schema_workflow_patch.sql');
        await runSqlFile('schema_hr_patch.sql');

        // 6. Ejecutar Migración a UUID y Contactos
        await runSqlFile('schema_uuid_migration.sql');

        // 7. Ejecutar Reparación Forzada definitiva (Roles, Empleados, Líneas)
        await runSqlFile('schema_force_repair.sql');

        // 8. UNIFICACIÓN TOTAL DEFINITIVA (UUID Standard across all HR tables)
        await runSqlFile('schema_final_unification.sql');

        console.log('✅ Migraciones completadas exitosamente.');
        return true;
    } catch (error) {
        console.error('❌ Error ejecutando migraciones:', error);
        return false;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

if (require.main === module) {
    migrate().then(success => {
        if (!success) process.exit(1);
    });
}

module.exports = { migrate };
