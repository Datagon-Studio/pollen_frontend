// Single entry point for ALL /api/* routes on Vercel
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
  // With the rewrite in vercel.json, all /api/* requests come here.
  // req.url will be the path after /api (e.g., /v1/accounts/me)
  //
  // Express app mounts routes at /api/v1.
  // We prepend "/api" back so Express routing works correctly.

  const incomingUrl = req.url;
  req.url = `/api${incomingUrl}`;

  console.log('🚀 /api handler:', { incoming: incomingUrl, rewritten: req.url, method: req.method });

  try {
    const app = await loadApp();
    return app(req, res);
  } catch (error: any) {
    console.error('❌ Handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error?.message || 'Server error' });
    }
  }
}
