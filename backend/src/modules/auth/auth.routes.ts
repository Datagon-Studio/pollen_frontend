import { Router } from 'express';
import { requestStaffPasswordReset } from './staff-password-reset.service.js';
import { requestAppPasswordReset } from './app-password-reset.service.js';
import {
  getAdminFrontendUrl,
  isAllowedAdminOrigin,
} from '../../shared/utils/frontend-url.js';

export const authRoutes = Router();

/**
 * Public bridge for staff invite / reset emails.
 * Lands on a host that always resolves (app.pollean.com), then redirects to the
 * admin portal for this environment (Origin hint, ADMIN_FRONTEND_URL, or Vercel).
 */
authRoutes.get('/admin-password-setup', (req, res) => {
  const tokenHash = typeof req.query.token_hash === 'string' ? req.query.token_hash : '';
  const type = typeof req.query.type === 'string' ? req.query.type : 'recovery';
  const originHint = typeof req.query.origin === 'string' ? req.query.origin : null;

  if (!tokenHash) {
    res.status(400).type('text').send('This password setup link is missing its token.');
    return;
  }

  if (type !== 'recovery' && type !== 'invite') {
    res.status(400).type('text').send('This password setup link is invalid.');
    return;
  }

  const portalOrigin =
    originHint && isAllowedAdminOrigin(originHint)
      ? originHint
      : getAdminFrontendUrl(originHint);

  const params = new URLSearchParams({
    token_hash: tokenHash,
    type,
  });
  res.redirect(302, `${portalOrigin.replace(/\/$/, '')}/reset-password?${params.toString()}`);
});

function readEmailAndOrigin(req: { body?: unknown; headers: { origin?: string } }): {
  email: string;
  origin: string | null;
} {
  const body = (req.body || {}) as { email?: unknown; origin?: unknown };
  const email = typeof body.email === 'string' ? body.email : '';
  const origin =
    typeof body.origin === 'string'
      ? body.origin
      : typeof req.headers.origin === 'string'
        ? req.headers.origin
        : null;
  return { email, origin };
}

/** Public. Staff password reset for admin.pollean (no session required). */
authRoutes.post('/forgot-password', async (req, res) => {
  try {
    const { email, origin } = readEmailAndOrigin(req);
    const result = await requestStaffPasswordReset(email, origin);

    if (!result.success) {
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Staff password reset] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not send the reset email. Try again in a few minutes.',
    });
  }
});

/** Public. Group-app password reset for app.pollean (no session required). */
authRoutes.post('/app-forgot-password', async (req, res) => {
  try {
    const { email, origin } = readEmailAndOrigin(req);
    const result = await requestAppPasswordReset(email, origin);

    if (!result.success) {
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[App password reset] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not send the reset email. Try again in a few minutes.',
    });
  }
});
