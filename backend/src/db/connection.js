const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'metal_parts_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ [DB] Conexión a MySQL establecida correctamente.');
        connection.release();
    } catch (error) {
        console.error('❌ [DB] Error de conexión a MySQL:', error.message);
        throw error;
    }
}

module.exports = { pool, testConnection };
