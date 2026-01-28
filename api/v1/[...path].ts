// Vercel serverless catch-all for /api/v1/* routes
// Forwards requests into the built Express app in backend/dist/app.js

let appInstance: any = null;

async function loadApp() {
  if (appInstance) return appInstance;

  try {
    // We are in /api/v1/[...path].ts, so go up twice to reach backend/
    const mod = await import('../../backend/dist/app.js');
    appInstance = mod.app;
    console.log('✅ Loaded Express app from backend/dist/app.js');
    return appInstance;
  } catch (error: any) {
    console.error('❌ Failed to load Express app:', error?.message || error);
    throw new Error(`Failed to load Express app: ${error?.message || 'Unknown error'}`);
  }
}

export default async function handler(req: any, res: any) {
  console.log('🚀 /api/v1 catch-all handler invoked:', {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    path: req.path,
  });

  // Ensure Express sees a path under /api/v1/...
  if (!req.url.startsWith('/api/v1')) {
    req.url = `/api/v1${req.url}`;
  }

  try {
    const app = await loadApp();
    return app(req, res);
  } catch (error: any) {
    console.error('❌ Handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Server error - failed to initialize backend',
        details: error?.message,
      });
    }
  }
}

