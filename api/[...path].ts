// Vercel serverless function wrapper for Express app
// Import from dist (compiled output) - Vercel builds backend before deploying
let app: any;

try {
  const module = await import('../backend/dist/app.js');
  app = module.app;
  console.log('✅ Successfully loaded Express app from dist');
} catch (error) {
  console.error('❌ Failed to import from dist:', error);
  try {
    const module = await import('../backend/src/app.js');
    app = module.app;
    console.log('✅ Successfully loaded Express app from src (fallback)');
  } catch (fallbackError) {
    console.error('❌ Failed to import from src:', fallbackError);
    throw new Error('Failed to load Express app');
  }
}

// Export Express app directly - Vercel handles this automatically
export default app;
