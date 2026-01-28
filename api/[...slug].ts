// Vercel serverless function wrapper for Express app
// Use dynamic import to handle potential path issues and provide better error messages
let appInstance: any = null;

async function loadApp() {
  if (appInstance) return appInstance;
  
  try {
    // Try importing from dist first (production build)
    console.log('🔍 Attempting to import from ../backend/dist/app.js');
    const module = await import('../backend/dist/app.js');
    appInstance = module.app;
    console.log('✅ Successfully loaded Express app from dist');
    return appInstance;
  } catch (error: any) {
    console.error('❌ Failed to import from dist:', error?.message || error);
    console.error('Error details:', error);
    
    // Fallback: try src (for development or if dist path is wrong)
    try {
      console.log('🔍 Attempting fallback import from ../backend/src/app.js');
      const module = await import('../backend/src/app.js');
      appInstance = module.app;
      console.log('✅ Successfully loaded Express app from src (fallback)');
      return appInstance;
    } catch (fallbackError: any) {
      console.error('❌ Failed to import from src:', fallbackError?.message || fallbackError);
      throw new Error(`Failed to load Express app: ${error?.message || 'Unknown error'}`);
    }
  }
}

// Export handler function - Vercel will call this
export default async function handler(req: any, res: any) {
  // Log immediately to verify function is being called - this should appear in ALL requests to /api/*
  console.log('🚀🚀🚀 [...path] CATCH-ALL HANDLER CALLED 🚀🚀🚀');
  console.log('Request details:', {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    headers: Object.keys(req.headers || {}),
  });
  
  // Quick test response to verify function is working
  if (req.url?.includes('/test-catch-all')) {
    return res.json({ 
      message: 'Catch-all handler is working!',
      url: req.url,
      path: req.path,
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    const app = await loadApp();
    console.log('✅ Express app loaded, passing request to Express');
    console.log('📋 Request being passed to Express:', {
      method: req.method,
      url: req.url,
      originalUrl: req.originalUrl,
      path: req.path,
      baseUrl: req.baseUrl,
    });
    return app(req, res);
  } catch (error: any) {
    console.error('❌ Handler error:', error);
    console.error('Error stack:', error?.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to initialize server',
        details: error?.message,
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      });
    }
  }
}
