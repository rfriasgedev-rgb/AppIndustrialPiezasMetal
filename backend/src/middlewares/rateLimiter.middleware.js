const rateLimit = require('express-rate-limit');

// 1. Limiter general para toda la API (Prevención de DoS leve)
// Permite 100 peticiones por cada 15 minutos por IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    message: { error: 'Demasiadas peticiones desde esta IP, por favor inténtelo de nuevo después de 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 2. Limiter estricto solo para el Login (Prevención de Fuerza Bruta)
// Permite 5 intentos fallidos/exitosos por minuto por IP
const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 5,
    message: { error: 'Demasiados intentos de inicio de sesión. Por favor, espere 1 minuto.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { globalLimiter, loginLimiter };
