// Simple test function to verify Vercel recognizes api/ folder
export default function handler(req: any, res: any) {
  res.json({ 
    message: 'API function is working!',
    timestamp: new Date().toISOString(),
    path: req.url 
  });
}
