require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./db/connection');

global.isDbReady = false;
const { migrate } = require('./db/migrate');
const { seed } = require('./db/seed');

const PORT = process.env.PORT || 3001;

// Ruta de emergencia en la raíz para Healthcheck
app.get('/', (req, res) => {
    res.status(200).json({ status: 'root_ok', db: global.isDbReady });
});

// Inicia el servidor HTTP escuchando en 0.0.0.0 para compatibilidad con Railway
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log(`🚀 [API] Servidor HTTP corriendo en http://${HOST}:${PORT}`);
    console.log(`📦 [Ambiente] ${process.env.NODE_ENV || 'development'}`);
    
    // Latido de vida cada 10 segundos para ver en los logs
    setInterval(() => {
        console.log(`💓 [HEARTBEAT] El servidor sigue vivo y escuchando en el puerto ${PORT} - ${new Date().toISOString()}`);
    }, 10000);

    // Intentar conectar a la DB después de arrancar
    attemptDbConnection();
});

async function attemptDbConnection(retries = 15, delay = 5000) {
    for (let i = 1; i <= retries; i++) {
        try {
            await testConnection();
            console.log('✅ [DB] Base de datos conectada y lista.');
            global.isDbReady = true;
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
    global.isDbReady = false;
}
