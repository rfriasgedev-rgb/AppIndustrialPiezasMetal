const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

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
const workflowRoutes = require('./routes/workflow.routes');
const planningRoutes = require('./routes/planning.routes');
const departmentsRoutes = require('./routes/departments.routes');
const schedulesRoutes = require('./routes/schedules.routes');
const employeeRolesRoutes = require('./routes/employee_roles.routes');
const employeesRoutes = require('./routes/employees.routes');
const productionLinesRoutes = require('./routes/production_lines.routes');
const debugController = require('./controllers/debug.controller');
const { errorHandler } = require('./middlewares/error.middleware');
const path = require('path');

const app = express();
app.set('trust proxy', 1); // Trust Railway proxy

// RUTA DE DIAGNÓSTICO PRIORITARIA (Bypass for Railway Debug)
const debugController = require('./controllers/debug.controller');
app.get('/api/debug/db', debugController.getDbStatus);

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
app.use(cookieParser());

// Health Check (Always available and at the root for Railway)
app.get('/health', (req, res) => {
    console.log('💓 Railway /health hit!');
    res.json({ status: 'OK', timestamp: new Date().toISOString(), db: global.isDbReady });
});

app.get('/api/debug/db', debugController.getDbStatus);

// Servir archivos estáticos (imágenes)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.urlencoded({ extended: true }));

const { globalLimiter } = require('./middlewares/rateLimiter.middleware');

// Routes
app.use('/api/', globalLimiter);
app.use('/api/', (req, res, next) => {
    if (global.isDbReady === false) {
        return res.status(503).json({ error: 'El servidor está conectando con la base de datos...' });
    }
    next();
});

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
app.use('/api/workflow', workflowRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/employee-roles', employeeRolesRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/production-lines', productionLinesRoutes);

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
