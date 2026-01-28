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
  // IMPORTANT:
  // - When invoked as /api/index.ts, req.url is NOT consistent across Vercel setups.
  // - With our rewrite, Vercel currently forwards /api/* → /api and passes the
  //   original path in a `path=` query param, but req.url may ALSO already include
  //   "/api/v1/..." (which caused us to accidentally generate "/api/api/v1/...").
  //
  // Goal: make Express see "/api/v1/..." so it matches app.use('/api/v1', routes).

  const incomingUrl = req.url || '/';
  const url = new URL(incomingUrl, 'http://local');

  // If the rewrite provided the original path in ?path=..., prefer that.
  // Example: ?path=v1%2Fusers%2Fprofile  ->  /api/v1/users/profile
  const forwardedPath = url.searchParams.get('path');
  if (forwardedPath) {
    url.searchParams.delete('path');
    url.pathname = `/api/${forwardedPath.replace(/^\/+/, '')}`;
  }

  // Normalize pathname so we don't double-prefix /api.
  if (!url.pathname.startsWith('/api/')) {
    url.pathname = `/api${url.pathname.startsWith('/') ? '' : '/'}${url.pathname}`;
  }

  req.url = `${url.pathname}${url.search}`;

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
