import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env.js';
import { routes } from './routes.js';

export const app = express();

// Security middleware
app.use(helmet());
// CORS: In production (Vercel), frontend and backend are same origin
// In dev, use configured FRONTEND_URL
const corsOptions = process.env.VERCEL || process.env.VERCEL_URL
  ? {
      origin: true, // Allow same origin in Vercel (frontend and backend same domain)
      credentials: true,
    }
  : {
      origin: env.FRONTEND_URL,
      credentials: true,
    };
app.use(cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log all incoming requests
app.use((req, _res, next) => {
  console.log('📥 Express received request:', {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    path: req.path,
    baseUrl: req.baseUrl,
  });
  next();
});

// Health check - accessible at both /health and /api/v1/health
app.get('/health', (_req, res) => {
  console.log('🏥 Health check called');
  // Prevent caching of health checks
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health', (_req, res) => {
  console.log('🏥 Health check called (via /api/v1/health)');
  // Prevent caching of health checks
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test endpoint to verify backend is running
app.get('/test', (_req, res) => {
  console.log('🧪 Test endpoint called');
  res.json({ 
    message: 'Backend is running!',
    timestamp: new Date().toISOString(),
    arkeselConfigured: !!process.env.ARKESEL_API_KEY,
  });
});

// API Routes
// On Vercel serverless, the function receives the full path including /api/v1
// In local dev or standalone deployment, also use /api/v1
app.use('/api/v1', routes);

// Also mount routes at root for Vercel compatibility (in case path is stripped)
if (process.env.VERCEL) {
  app.use('/v1', routes);
  app.use('/', routes); // Fallback
}

// 404 handler
app.use((_req, res) => {
  // Prevent caching of 404 responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.status(404).json({ success: false, error: 'Not found' });
});

// Error handler - must be last middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('═══════════════════════════════════════════════════════');
  console.error('❌ Unhandled Error:', err);
  console.error('📚 Stack:', err.stack);
  console.error('═══════════════════════════════════════════════════════');
  
  // Make sure we haven't already sent a response
  if (!res.headersSent) {
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Internal server error' 
    });
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('═══════════════════════════════════════════════════════');
  console.error('❌ Unhandled Promise Rejection:', reason);
  console.error('📚 Promise:', promise);
  console.error('═══════════════════════════════════════════════════════');
});

