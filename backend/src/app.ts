import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env.js';
import { routes } from './routes.js';

export const app = express();

// Security middleware
app.use(helmet());
// CORS: In production (Vercel), frontend and backend are same origin, so allow all
// In dev, use configured FRONTEND_URL
app.use(cors({
  origin: process.env.VERCEL 
    ? true // Allow same origin in Vercel (frontend and backend same domain)
    : env.FRONTEND_URL,
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  console.log('🏥 Health check called');
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
app.use('/api/v1', routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

