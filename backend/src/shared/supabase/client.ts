import { createClient } from '@supabase/supabase-js';
import { env } from '../../env.js';

// Service role client for backend operations (bypasses RLS)
// The service role key (second parameter) automatically bypasses RLS
// Do NOT use auth functions on this client as they return user sessions
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

