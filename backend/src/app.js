const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const clientRoutes = require('./routes/clients.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const purchaseRoutes = require('./routes/purchases.routes');
const productionRoutes = require('./routes/production.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const productsRoutes = require('./routes/products.routes');
const unitsRoutes = require('./routes/units.routes');
const categoriesRoutes = require('./routes/categories.routes');
const requisitionsRoutes = require('./routes/requisitions.routes');
const { errorHandler } = require('./middlewares/error.middleware');
const path = require('path');

const app = express();

// Security & Utility Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "data:"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
        },
    },
}));
app.use(morgan('dev'));
app.use(express.json());

// Servir archivos estáticos (imágenes)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.urlencoded({ extended: true }));

const { globalLimiter } = require('./middlewares/rateLimiter.middleware');

// Routes
app.use('/api/', globalLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/requisitions', requisitionsRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend static files
const fs = require('fs');
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('API is running. Frontend build not found.');
    });
}

// Global Error Handler
app.use(errorHandler);

module.exports = app;
