import { NextFunction, Request, Response } from 'express';
import { supabase } from '../supabase/client.js';
import { AuthenticatedRequest } from './auth.middleware.js';

const readOnlyMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Keep officer/viewer accounts read-only at the API boundary.
 * Platform superadmins and users who manage at least one account may mutate data.
 */
export async function requireAccountAdminForWrites(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (readOnlyMethods.has(req.method)) {
    next();
    return;
  }

  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  try {
    const [profileResult, accountResult] = await Promise.all([
      supabase.from('users').select('role').eq('user_id', userId).maybeSingle(),
      supabase
        .from('user_accounts')
        .select('account_id')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle(),
    ]);

    if (profileResult.error) {
      throw profileResult.error;
    }
    if (accountResult.error) {
      throw accountResult.error;
    }

    if (profileResult.data?.role === 'superadmin' || accountResult.data) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: 'Collector access is view-only',
    });
  } catch (error) {
    console.error('Failed to verify account write access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify account permissions',
    });
  }
}
