// Vercel serverless function wrapper for Express app
// Import synchronously - Vercel will have built the backend before deploying
import { app } from '../backend/dist/app.js';

// Log to verify function is being loaded
console.log('🔧 API function loaded, Express app:', typeof app);

// Export Express app directly - Vercel handles Express apps automatically
export default app;
