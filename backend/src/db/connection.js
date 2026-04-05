const mysql = require('mysql2/promise');

const dbConfig = process.env.MYSQL_URL || process.env.DATABASE_URL;

const pool = dbConfig 
    ? mysql.createPool(dbConfig)
    : mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'metal_parts_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 10
    });

// Híbrido: permitir tanto db.query como db.pool.query
pool.pool = pool;

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ [DB] Conexión a MySQL establecida correctamente.');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ [DB] Error de conexión a MySQL:', error.message);
        return false;
    }
}

pool.testConnection = testConnection;

module.exports = pool;
