// Global catch-all for /api/* routes on Vercel
// Ensures any /api/... request is forwarded to the Express app.

let appInstance: any = null;

async function loadApp() {
  if (appInstance) return appInstance;

  try {
    const mod = await import('../backend/dist/app.js');
    appInstance = mod.app;
    console.log('✅ Loaded Express app from backend/dist/app.js (global /api catch-all)');
    return appInstance;
  } catch (error: any) {
    console.error('❌ Failed to load Express app (global /api catch-all):', error?.message || error);
    throw new Error(`Failed to load Express app: ${error?.message || 'Unknown error'}`);
  }
}

export default async function handler(req: any, res: any) {
  console.log('🚀 Global /api catch-all handler invoked:', {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    path: req.path,
  });

  // Vercel strips the leading /api segment when invoking serverless functions.
  // For example:
  //   Request URL: /api/v1/accounts/me
  //   req.url inside this function: /v1/accounts/me
  //
  // Our Express app, when running on Vercel (process.env.VERCEL), mounts routes at:
  //   /v1, and at / (root) as a fallback.
  //
  // So we can safely ensure the URL starts with /v1 to hit the correct routes.

  if (!req.url.startsWith('/v1')) {
    req.url = `/v1${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  try {
    const app = await loadApp();
    return app(req, res);
  } catch (error: any) {
    console.error('❌ Global /api handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Server error - failed to initialize backend (global /api handler)',
        details: error?.message,
      });
    }
  }
}

