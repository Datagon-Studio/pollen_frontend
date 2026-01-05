import { env } from './env.js';
import { app } from './app.js';

const PORT = parseInt(env.PORT, 10);

app.listen(PORT, () => {
  console.log(`🐝 PollenHive API running on port ${PORT}`);
  console.log(`📍 Environment: ${env.NODE_ENV}`);
});

