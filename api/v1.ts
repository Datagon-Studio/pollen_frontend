// Vercel serverless function for /api/v1 routes
let appInstance: any = null;

async function loadApp() {
  if (appInstance) return appInstance;
  
  try {
    const module = await import('../backend/dist/app.js');
    appInstance = module.app;
    console.log('✅ Loaded Express app');
    return appInstance;
  } catch (error: any) {
    console.error('❌ Failed to load:', error?.message);
    throw new Error(`Failed to load Express app: ${error?.message}`);
  }
}

export default async function handler(req: any, res: any) {
  console.log('🚀 v1 handler called:', req.url);
  
  //Prepend /api/v1 to the path since Vercel strips it
  req.url = `/api/v1${req.url}`;
  
  try {
    const app = await loadApp();
    return app(req, res);
  } catch (error: any) {
    console.error('❌ Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
}
