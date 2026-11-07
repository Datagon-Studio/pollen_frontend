/**
 * Authentication Middleware
 * 
 * Validates JWT tokens from Supabase Auth.
 * Extracts user information and attaches to request.
 * 
 * Security: Uses Supabase admin API to verify tokens securely.
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { env } from '../../env.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Create a Supabase client for auth verification (uses service role for admin access)
const authClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type VerifiedUser = { id: string; email: string };

const verifiedUsers = new Map<string, { user: VerifiedUser; expiresAt: number }>();
const pendingVerifications = new Map<string, Promise<VerifiedUser | null>>();
const AUTH_CACHE_MS = 60_000;

async function verifyToken(token: string): Promise<VerifiedUser | null> {
  const cached = verifiedUsers.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  const pending = pendingVerifications.get(token);
  if (pending) return pending;

  const verification = authClient.auth.getUser(token).then(({ data, error }) => {
    if (error || !data.user) return null;
    const user = { id: data.user.id, email: data.user.email || '' };
    verifiedUsers.set(token, { user, expiresAt: Date.now() + AUTH_CACHE_MS });
    return user;
  }).finally(() => {
    pendingVerifications.delete(token);
  });

  pendingVerifications.set(token, verification);
  return verification;
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authorization token required',
      });
      return;
    }

    const user = await verifyToken(token);

    if (!user) {
      verifiedUsers.delete(token);
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    (req as AuthenticatedRequest).user = user;

    next();
  } catch (error) {
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ Auth middleware error:', error);
    if (error instanceof Error) {
      console.error('💬 Message:', error.message);
      console.error('📚 Stack:', error.stack);
    }
    console.error('═══════════════════════════════════════════════════════');
    
    if (!res.headersSent) {
      res.status(401).json({
        success: false,
        error: 'Authentication failed',
      });
    }
  }
}

