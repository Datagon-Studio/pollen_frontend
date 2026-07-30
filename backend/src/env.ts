import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

dotenv.config({ path: resolve(backendRoot, '.env') });
dotenv.config({ path: resolve(backendRoot, '.env.local'), override: true });

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  FRONTEND_URL: z.string().default('http://localhost:8080'),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  EMAIL_VERIFICATION_SECRET: z.string().optional(),
  ARKESEL_API_KEY: z.string().optional(),
  POSTMARK_API_TOKEN: z.string().optional(),
  POSTMARK_FROM_EMAIL: z.string().optional(),
  POSTMARK_MESSAGE_STREAM: z.string().default('outbound'),
  BITLY_ACCESS_TOKEN: z.string().optional(),
  BITLY_GROUP_GUID: z.string().optional(),
  BITLY_DOMAIN: z.string().default('bit.ly'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

const env = parsed.data;

// Warn if optional keys are missing (but don't fail - they're optional)
if (!env.PAYSTACK_SECRET_KEY) {
  console.warn('⚠️  PAYSTACK_SECRET_KEY not set. Payment features will not work.');
}
if (!env.PAYSTACK_PUBLIC_KEY) {
  console.warn('⚠️  PAYSTACK_PUBLIC_KEY not set. Payment features will not work.');
}
if (!env.EMAIL_VERIFICATION_SECRET) {
  console.warn('⚠️  EMAIL_VERIFICATION_SECRET not set. Email verification will not work.');
}
if (!env.BITLY_ACCESS_TOKEN) {
  console.warn('⚠️  BITLY_ACCESS_TOKEN not set. Link shortening will not work.');
}

export { env };

