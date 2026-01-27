// Vercel serverless function wrapper for Express app
// Import from dist (compiled output) - Vercel builds backend before deploying
let app;
try {
  // Try importing from dist first (production build)
  app = (await import('../backend/dist/app.js')).app;
} catch (error) {
  // Fallback to src for local development or if dist import fails
  console.warn('Failed to import from dist, trying src:', error);
  app = (await import('../backend/src/app.js')).app;
}

export default app;
