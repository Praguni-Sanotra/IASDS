import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { initSocket } from './socket';
import logger from './utils/logger';
import redis from './config/redis';

// Routes
import authRoutes from './routes/authRoutes';
import facultyRoutes from './routes/facultyRoutes';
import subjectRoutes from './routes/subjectRoutes';
import roomRoutes from './routes/roomRoutes';
import constraintRoutes from './routes/constraintRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import exportRoutes from './routes/exportRoutes';
import adminTimetableRoutes from './routes/adminTimetableRoutes';
import hodRoutes from './routes/hodRoutes';

import { verifyToken, requireRole } from './middleware/auth';

dotenv.config();

const app = express();

// --- CORS MIDDLEWARE ---
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:3000'];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const httpServer = createServer(app);
const PORT = process.env.BACKEND_PORT || process.env.PORT || 5001;

// Initialize Socket.io
initSocket(httpServer);

// --- SECURITY HARDENING ---

// 1. Helmet for secure headers & CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || "http://localhost:3000", "ws:", "wss:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    }
  }
}));

// 2. Trust proxy (needed for rate limiting behind Nginx/Load Balancer)
app.set('trust proxy', 1);

// 3. Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests", retryAfter: "15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts", retryAfter: "15 minutes" }
});

const scheduleLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: "Schedule generation limit reached", retryAfter: "1 hour" }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
// app.use('/api/schedule/generate', scheduleLimiter); // Disabled for development

// 4. Data Sanitization
app.use(express.json({ limit: '10kb' })); // Body limit
// app.use(mongoSanitize()); // Disabled due to Express 5 compatibility issues
app.use(hpp());

// 5. Logging
app.use(morgan('combined', { 
  stream: { write: (message: string) => logger.info(message.trim()) } 
}));

app.use(cookieParser());

// --- ROUTES ---

app.use('/api/auth', authRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/constraints', constraintRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/admin', adminTimetableRoutes); // AI timetable generation
app.use('/api/hod', hodRoutes); // HOD approval workflows


// --- HEALTH CHECKS ---

app.get('/api/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  let redisStatus = 'disconnected';
  try {
    const ping = await redis.ping();
    if (ping === 'PONG') redisStatus = 'connected';
  } catch (e) {}

  res.json({
    status: 'ok',
    db: dbStatus,
    redis: redisStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health/detailed', verifyToken, requireRole('ADMIN'), (req, res) => {
  res.json({
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    connections: mongoose.connection.base.connections.length,
    env: process.env.NODE_ENV
  });
});

// Admin Audit Log Endpoint
app.get('/api/admin/audit-logs', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entity, user } = req.query;
    const query: any = {};
    if (action) query.action = action;
    if (entity) query.entity = entity;
    if (user) query.performedBy = user;

    const logs = await require('./models/AuditLog').default.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('performedBy', 'name email');

    const total = await require('./models/AuditLog').default.countDocuments(query);

    res.json({ data: logs, total, pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'IASDS Hardened Backend is running!' });
});

// Start Server and Connect to Database
httpServer.listen(PORT, async () => {
  logger.info(`🚀 Server is running on http://localhost:${PORT}`);
  await connectDB();
});
