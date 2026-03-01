require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
    let conn;
    try {
        console.log('1. Connecting to DB ' + process.env.DB_NAME + '...');
        conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'metal_parts_db',
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });

        console.log('2. Reading SQL File...');
        const sql = fs.readFileSync('db/schema_requisitions_patch.sql', 'utf8');

        console.log('3. Applying patch...');
        await conn.query(sql);

        console.log('FINALIZADO OK. Tablas creadas en ' + process.env.DB_NAME);
    } catch (e) {
        console.error('SERVER CRASH:', e);
    } finally {
        if (conn) await conn.end();
        process.exit(0);
    }
}
run();
