import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  FRONTEND_URL: z.string().default('http://localhost:8080'),
  ARKESEL_API_KEY: z.string().optional(),
  POSTMARK_API_TOKEN: z.string().optional(),
  POSTMARK_FROM_EMAIL: z.string().optional(),
  POSTMARK_MESSAGE_STREAM: z.string().default('outbound'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;

