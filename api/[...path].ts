import { app } from '../backend/src/app.js';

// Vercel serverless function wrapper for Express app
// This catches all /api/* routes and forwards them to Express
// Vercel automatically handles Express apps when exported as default
export default app;
