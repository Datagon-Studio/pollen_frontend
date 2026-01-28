// Single catch-all for ALL /api/* routes on Vercel
// Forwards everything to the Express app in backend/dist/app.js

let appInstance: any = null;

async function loadApp() {
  if (appInstance) return appInstance;

  const mod = await import('../backend/dist/app.js');
  appInstance = mod.app;
  return appInstance;
}

export default async function handler(req: any, res: any) {
  // Vercel strips "/api" from the URL when invoking functions in /api folder.
  // Example: browser requests /api/v1/accounts/me → req.url = "/v1/accounts/me"
  //
  // Express app mounts routes at /api/v1 (and /v1 in Vercel mode as fallback).
  // We need to prepend "/api" back so Express routing works correctly.

  const incomingUrl = req.url;
  req.url = `/api${incomingUrl}`;

  console.log('🚀 /api catch-all:', { incoming: incomingUrl, rewritten: req.url, method: req.method });

  try {
    const app = await loadApp();
    return app(req, res);
  } catch (error: any) {
    console.error('❌ Catch-all error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error?.message || 'Server error' });
    }
  }
}

