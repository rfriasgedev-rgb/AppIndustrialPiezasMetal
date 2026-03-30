require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function migrate() {
    console.log('🔄 Ejecutando migraciones de base de datos...');
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'metal_parts_db',
            multipleStatements: true
        });

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
                 // Si falla por columna duplicada, lo ignoramos, significa que ya corrió
                 if(err.code === 'ER_DUP_FIELDNAME') {
                    console.log('Las columnas de workflow ya existen, continuando...');
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
