const mysql = require('mysql2/promise');

const dbConfig = process.env.MYSQL_URL || process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'metal_parts_db'
};

const poolConfig = typeof dbConfig === 'string'
    ? { uri: dbConfig, waitForConnections: true, connectionLimit: 10, queueLimit: 0, charset: 'utf8mb4' }
    : { ...dbConfig, waitForConnections: true, connectionLimit: 10, queueLimit: 0, charset: 'utf8mb4' };

const pool = mysql.createPool(poolConfig);

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
