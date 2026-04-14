const fs = require('fs');
const path = require('path');
const { pool } = require('./connection');

async function migrate() {
    console.log('🔄 Ejecutando consolidación de base de datos...');
    global.migrationResults = [];
    const log = (msg) => {
        console.log(msg);
        global.migrationResults.push(`[${new Date().toISOString()}] ${msg}`);
    };

    try {
        const connection = pool;
        log('🔌 Conexión al pool establecida.');

        const runSqlFile = async (fileName) => {
            const filePath = path.join(__dirname, fileName);
            if (fs.existsSync(filePath)) {
                log(`📖 Procesando ${fileName}...`);
                const sqlContent = fs.readFileSync(filePath, 'utf8');
                const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);
                
                for (const statement of statements) {
                    try {
                        await connection.query(statement);
                    } catch (err) {
                        // Ignorar errores de duplicados para permitir re-ejecución
                        if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_DUP_KEYNAME' && 
                            err.code !== 'ER_DUP_ENTRY' && err.errno !== 1060 && err.errno !== 1061 && err.errno !== 1062) {
                            log(`⚠️ Aviso en ${fileName}: ${err.message}`);
                        }
                    }
                }
            }
        };

        // PASOS CRÍTICOS PARA ESTABILIDAD
        await runSqlFile('schema.sql');                     // Estructura base
        await runSqlFile('schema_hard_reset.sql');          // Rescate nuclear RRHH (Standard UUID)
        await runSqlFile('schema_units_patch.sql');         // Patch for units
        await runSqlFile('schema_requisitions_patch.sql');  // Patch for requisitions
        await runSqlFile('schema_production_line_patch.sql'); // Patch for line tracking
        await runSqlFile('schema_stage_log_snapshot.sql');  // Patch for operator/team snapshots
        await runSqlFile('schema_stage_enum_patch.sql');    // Patch: ENUM stage (DESIGN, WELDING)

        log('✅ Sistema de base de datos estabilizado.');
        return true;
    } catch (error) {
        if (global.migrationResults) {
            global.migrationResults.push(`[${new Date().toISOString()}] ❌ ERROR: ${error.message}`);
        }
        console.error('❌ Error en estabilización:', error);
        return false;
    }
}

module.exports = { migrate };
