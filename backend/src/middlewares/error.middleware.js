const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const isDev = process.env.NODE_ENV !== 'production';
    console.error(`[ERROR] [${new Date().toISOString()}] ${err.message}`);
    require('fs').appendFileSync('error_dump.txt', `\n--- [${new Date().toISOString()}] ---\n${err.stack}\n`, 'utf8');
    res.status(statusCode).json({
        error: {
            message: err.message || 'Error interno del servidor.',
            ...(isDev && { stack: err.stack }),
        },
    });
};

class AppError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}

module.exports = { errorHandler, AppError };
