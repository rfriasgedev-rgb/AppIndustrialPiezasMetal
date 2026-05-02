// Migration: Add assigned_to and assigned_at to production_order_details
require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'metal_parts_db',
    });

    try {
        await pool.query(`
            ALTER TABLE production_order_details
            ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(36) NULL DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS assigned_at DATETIME NULL DEFAULT NULL
        `);
        console.log('✅ Migración OK: columnas assigned_to y assigned_at agregadas a production_order_details');
    } catch (err) {
        console.error('❌ Error en migración:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
