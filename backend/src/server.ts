import { env } from './env.js';
import { app } from './app.js';
import { arkeselService } from './shared/services/arkesel.service.js';

const PORT = parseInt(env.PORT, 10);

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 Pollean Backend Server Started');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`🐝 API running on port ${PORT}`);
  console.log(`📍 Environment: ${env.NODE_ENV}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(`📡 API Base: http://localhost:${PORT}/api/v1`);
  console.log('═══════════════════════════════════════════════════════');
  
  // Initialize Arkesel service to trigger constructor logging
  console.log('🔧 Initializing Arkesel service...');
  // Service is already initialized via import, but this ensures logs appear
});

