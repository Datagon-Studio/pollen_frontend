import { Router } from 'express';
import { requestStaffPasswordReset } from './staff-password-reset.service.js';
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

/** Public. Staff password reset does not require a session. */
authRoutes.post('/forgot-password', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    const origin =
      typeof req.body?.origin === 'string'
        ? req.body.origin
        : typeof req.headers.origin === 'string'
          ? req.headers.origin
          : null;
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
