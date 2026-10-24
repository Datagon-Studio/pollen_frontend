import { Router } from 'express';
import { requestStaffPasswordReset } from './staff-password-reset.service.js';

export const authRoutes = Router();

/** Public. Staff password reset does not require a session. */
authRoutes.post('/forgot-password', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    const origin = typeof req.body?.origin === 'string' ? req.body.origin : null;
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
