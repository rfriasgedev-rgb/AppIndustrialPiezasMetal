require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function migrate() {
    console.log('🔄 Ejecutando migraciones de base de datos...');
    let connection;
    try {
        const dbConfig = process.env.MYSQL_URL || process.env.DATABASE_URL || {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'metal_parts_db'
        };
        const connectionConfig = typeof dbConfig === 'string'
            ? { uri: dbConfig, multipleStatements: true }
            : { ...dbConfig, multipleStatements: true };

        connection = await mysql.createConnection(connectionConfig);

        // 1. Ejecutar schema básico
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            console.log('Ejecutando schema.sql...');
            await connection.query(schemaSql);
        }

        // 2. Ejecutar parche de unidades
        const patch1Path = path.join(__dirname, 'schema_units_patch.sql');
        if (fs.existsSync(patch1Path)) {
            const patch1Sql = fs.readFileSync(patch1Path, 'utf8');
            console.log('Ejecutando schema_units_patch.sql...');
            await connection.query(patch1Sql);
        }

        // 3. Ejecutar parche de requisiciones
        const patch2Path = path.join(__dirname, 'schema_requisitions_patch.sql');
        if (fs.existsSync(patch2Path)) {
            const patch2Sql = fs.readFileSync(patch2Path, 'utf8');
            console.log('Ejecutando schema_requisitions_patch.sql...');
            await connection.query(patch2Sql);
        }

        // 4. Ejecutar parche de flujo de trabajo (departamentos, turnos, etapas)
        const patch3Path = path.join(__dirname, 'schema_workflow_patch.sql');
        if (fs.existsSync(patch3Path)) {
            const patch3Sql = fs.readFileSync(patch3Path, 'utf8');
            console.log('Ejecutando schema_workflow_patch.sql...');
            // Dividir sentencias ALTER TABLE que fallarían en múltiple statements en algunos casos
            // o ejecutarlas normalmente si multipleStatements está habilitado
            try {
                await connection.query(patch3Sql);
            } catch (err) {
                 // Si falla por columna duplicada o restricción duplicada, lo ignoramos
                 if(err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.errno === 1060 || err.errno === 1061) {
                    console.log('Las columnas o restricciones de workflow ya existen, continuando...');
                 } else {
                    throw err;
                 }
            }
        }

        // 5. Ejecutar parche de HR y Líneas de Producción
        const patch4Path = path.join(__dirname, 'schema_hr_patch.sql');
        if (fs.existsSync(patch4Path)) {
            const patch4Sql = fs.readFileSync(patch4Path, 'utf8');
            console.log('Ejecutando schema_hr_patch.sql...');
            try {
                await connection.query(patch4Sql);
            } catch (err) {
                // Manejar errores de inserción duplicada en patches que ya corrieron parcialmente
                if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
                    console.log('Datos de HR ya insertados previamente o parche ya aplicado parcialmente.');
                } else {
                    throw err;
                }
            }
        }

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
