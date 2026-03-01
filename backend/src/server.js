require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./db/connection');

const PORT = process.env.PORT || 3001;

// Inicia el servidor HTTP aunque MySQL no esté disponible aún
app.listen(PORT, () => {
    console.log(`🚀 [API] Servidor HTTP corriendo en http://localhost:${PORT}`);
    console.log(`📦 [Ambiente] ${process.env.NODE_ENV || 'development'}`);
    // Intentar conectar a la DB después de arrancar
    attemptDbConnection();
});

async function attemptDbConnection(retries = 5, delay = 3000) {
    for (let i = 1; i <= retries; i++) {
        try {
            await testConnection();
            console.log('✅ [DB] Base de datos conectada y lista.');
            return;
        } catch (err) {
            console.warn(`⚠️  [DB] Intento ${i}/${retries} fallido: ${err.message}`);
            if (i < retries) {
                console.log(`   Reintentando en ${delay / 1000}s...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    console.error('❌ [DB] No se pudo conectar a MySQL. Verifica que el servicio esté activo.');
    console.error('   Las rutas de la API devolverán error 503 hasta que MySQL esté disponible.');
}
