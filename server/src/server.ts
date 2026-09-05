import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import dns from 'dns';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { connectDatabase, prisma } from './config/database.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { startEscalationCron } from './services/escalationService.js';
import { initializeSocket } from './config/socket.js';
import { initializeFirebase } from './config/firebase.config.js';
import { startAllCronJobs } from './services/cronService.js';

// Force DNS resolution to prefer IPv4 to avoid Supabase IPv6 ENETUNREACH errors on IPv4-only AWS instances
dns.setDefaultResultOrder('ipv4first');

// Load env vars
dotenv.config();

// Import routes
import authRoutes from './routes/authRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import licenseRoutes from './routes/licenseRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import hrRoutes from './routes/hrRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import operationsRoutes from './routes/operationsRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import escalationRoutes from './routes/escalationRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
// New enhancement routes
import ceoRoutes from './routes/ceoRoutes.js';
import orgAdminRoutes from './routes/orgAdminRoutes.js';
import subDepartmentRoutes from './routes/subDepartmentRoutes.js';
import credentialRoutes from './routes/credentialRoutes.js';
import editDeleteRoutes from './routes/editDeleteRoutes.js';
import reregRoutes from './routes/reregRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
import sessionRequestRoutes from './routes/sessionRequestRoutes.js';
import gstRoutes from './routes/gstRoutes.js';
import incentiveRoutes from './routes/incentiveRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import paymentScheduleRoutes from './routes/paymentScheduleRoutes.js';
import studentPortalRoutes from './routes/studentPortalRoutes.js';
import collectionsPanelRoutes from './routes/collectionsPanelRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';
import iclockRoutes from './routes/iclockRoutes.js';
import examRoutes from './routes/examRoutes.js';
import communicationRoutes from './routes/communicationRoutes.js';
import biometricDeviceRoutes from './routes/biometricDeviceRoutes.js';
import fcmTokenRoutes from './routes/fcm-token.routes.js';
import appReleaseRoutes from './routes/appReleaseRoutes.js';
import academicCenterRoutes from './modules/academic-center/academicCenter.routes.js';

const app: Application = express();

// Trust reverse proxy (Nginx) headers for rate limiting
app.set('trust proxy', 1);

// Connect to database
connectDatabase();

// Initialize Firebase Admin
initializeFirebase();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// Serve uploaded files via S3 proxy to maintain existing URLs
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  }
});

const s3ProxyRoute = async (req: express.Request, res: express.Response) => {
  try {
    const key = req.params.key;
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME || 'my-bucket',
      Key: key,
    });
    const response = await s3.send(command);
    if (response.ContentType) {
      res.setHeader('Content-Type', response.ContentType);
    }
    if (response.Body) {
      const stream = response.Body as any;
      stream.on('error', (streamErr: any) => {
        console.error('S3 Stream Error:', streamErr);
        if (!res.headersSent) res.status(500).end();
      });
      res.on('error', (resErr) => {
        console.error('Response Stream Error:', resErr);
      });
      stream.pipe(res);
    } else {
      res.status(404).send('Not Found');
    }
  } catch (err) {
    console.error('S3 Fetch Error:', err);
    res.status(404).send('Not Found');
  }
};

app.get('/uploads/:key', s3ProxyRoute);
app.get('/api/v1/uploads/:key', s3ProxyRoute);

// Body parser
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api', limiter);

// iClock ADMS Routes (Mount these directly since biometric machines hardcode /iclock paths)
app.use('/iclock', iclockRoutes);

// API version
const API_VERSION = process.env.API_VERSION || 'v1';

// Mount routes
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/organizations`, organizationRoutes);
app.use(`/api/${API_VERSION}/licenses`, licenseRoutes);
app.use(`/api/${API_VERSION}/departments`, departmentRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/tasks`, taskRoutes);
app.use(`/api/${API_VERSION}/students`, studentRoutes);
app.use(`/api/${API_VERSION}/hr`, hrRoutes);
app.use(`/api/${API_VERSION}/finance`, financeRoutes);
app.use(`/api/${API_VERSION}/operations`, operationsRoutes);
app.use(`/api/${API_VERSION}/sales`, salesRoutes);
app.use(`/api/${API_VERSION}/dashboard`, dashboardRoutes);
app.use(`/api/${API_VERSION}/escalations`, escalationRoutes);
app.use(`/api/${API_VERSION}/payroll`, payrollRoutes);
app.use(`/api/${API_VERSION}/attendance`, attendanceRoutes);
app.use('/api/biometric-devices', biometricDeviceRoutes);
app.use(`/api/${API_VERSION}/biometric-devices`, biometricDeviceRoutes);
// New enhancement routes
app.use(`/api/${API_VERSION}/ceo`, ceoRoutes);
app.use(`/api/${API_VERSION}/org`, orgAdminRoutes);
app.use(`/api/${API_VERSION}/sub-departments`, subDepartmentRoutes);
app.use(`/api/${API_VERSION}/credentials`, credentialRoutes);
app.use(`/api/${API_VERSION}/edit-delete`, editDeleteRoutes);
app.use(`/api/${API_VERSION}/rereg`, reregRoutes);
app.use(`/api/${API_VERSION}/referrals`, referralRoutes);
app.use(`/api/${API_VERSION}/sessions`, sessionRequestRoutes);
app.use(`/api/${API_VERSION}/gst`, gstRoutes);
app.use(`/api/${API_VERSION}/incentives`, incentiveRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${API_VERSION}/public`, publicRoutes);
app.use(`/api/${API_VERSION}/enrollment`, enrollmentRoutes);
app.use(`/api/${API_VERSION}/payment-schedules`, paymentScheduleRoutes);
app.use(`/api/${API_VERSION}/student-portal`, studentPortalRoutes);
app.use(`/api/${API_VERSION}/collections`, collectionsPanelRoutes);
app.use(`/api/${API_VERSION}/assets`, assetRoutes);
app.use(`/api/${API_VERSION}/documents`, documentRoutes);
app.use(`/api/${API_VERSION}/meetings`, meetingRoutes);
app.use(`/api/${API_VERSION}/exams`, examRoutes);
app.use(`/api/${API_VERSION}/communications`, communicationRoutes);
app.use(`/api/${API_VERSION}/fcm-token`, fcmTokenRoutes);
app.use(`/api/${API_VERSION}/app-releases`, appReleaseRoutes);
app.use(`/api/${API_VERSION}/academic-center`, academicCenterRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      message: 'ERM System API is running',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'ERM System API is running, but database is disconnected',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
if (process.env.NODE_ENV !== 'test') {
  initializeSocket(httpServer);
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Socket.io initialized');
  }
}

// Start cron jobs
if (process.env.NODE_ENV !== 'test') {
  startAllCronJobs();
}

const PORT = process.env.PORT || 5000;

const server = httpServer.listen(PORT, () => {
  // Increase server timeouts for long-running migration requests
  server.setTimeout(600000); // 10 minutes
  server.keepAliveTimeout = 600000;
  server.headersTimeout = 601000;
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 ERM System Server Running                           ║
║                                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║   Port: ${PORT}                                              ║
║   API Version: ${API_VERSION}                                       ║
║                                                           ║
║   📚 API Docs: http://localhost:${PORT}/api/${API_VERSION}           ║
║   ❤️  Health: http://localhost:${PORT}/health                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

export default app;
