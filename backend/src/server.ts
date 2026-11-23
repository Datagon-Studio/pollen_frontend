import { env } from './env.js';
import { app } from './app.js';

const PORT = parseInt(env.PORT, 10);

app.listen(PORT);

