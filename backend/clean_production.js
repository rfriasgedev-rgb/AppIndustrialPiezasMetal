const { pool } = require('./src/db/connection');

async function cleanData() {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');

        const tables = [
            'production_stage_log_team',
            'production_stage_log',
            'production_order_details',
            'production_orders'
        ];

        for (const table of tables) {
            try {
                await conn.query(`TRUNCATE TABLE ${table}`);
                console.log(`✓ ${table} cleaned`);
            } catch (err) {
                if (err.code === 'ER_NO_SUCH_TABLE') {
                    console.log(`! ${table} does not exist, skipping...`);
                } else {
                    throw err;
                }
            }
        }

        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
        await conn.commit();
        console.log('\n✅ All existing production data cleaned successfully.');
    } catch (err) {
        await conn.rollback();
        console.error('❌ Error during cleanup:', err.message);
    } finally {
        conn.release();
        process.exit(0);
    }
}

cleanData();
