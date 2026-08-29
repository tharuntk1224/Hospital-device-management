import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import { config } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { globalRateLimiter } from './middleware/rateLimiter';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import departmentRoutes from './routes/departments.routes';
import categoryRoutes from './routes/categories.routes';
import deviceRoutes from './routes/devices.routes';
import technicianRoutes from './routes/technicians.routes';
import calibrationRoutes from './routes/calibrations.routes';
import maintenanceRoutes, { maintenanceRequestRouter } from './routes/maintenance.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportsRoutes from './routes/reports.routes';

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── General Middleware ───────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.isDevelopment ? 'dev' : 'combined'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api', globalRateLimiter);

// ─── Swagger API Docs ─────────────────────────────────────────────────────────
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Biomedical Device Management API',
      version: '1.0.0',
      description: 'REST API for hospital/laboratory biomedical device calibration and maintenance management',
    },
    servers: [{ url: `http://localhost:${config.port}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => { res.json(swaggerSpec); });

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/calibrations', calibrationRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/maintenance-requests', maintenanceRequestRouter);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', reportsRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
