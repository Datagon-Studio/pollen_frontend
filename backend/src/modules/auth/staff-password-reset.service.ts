import { supabase } from '../../shared/supabase/client.js';
import { postmarkService } from '../../shared/services/postmark.service.js';
import { isStaffRole } from '../../shared/middleware/staff.middleware.js';
import { getAdminFrontendUrl } from '../../shared/utils/frontend-url.js';

const RESET_COOLDOWN_MS = 60_000;
const recentResets = new Map<string, number>();

export type StaffPasswordResetResult =
  | { success: true }
  | { success: false; status: number; error: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Send a staff password-reset email through Postmark.
 * Supabase's built-in recovery mailer returns "Error sending recovery email" for this project.
 * The link uses token_hash so the admin reset page verifies it on click, matching collector invites.
 * Unknown and non-staff addresses get the same success response, so this does not reveal accounts.
 */
export async function requestStaffPasswordReset(
  email: string,
  requestedOrigin?: string | null
): Promise<StaffPasswordResetResult> {
  const normalized = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { success: false, status: 400, error: 'Enter a valid email address.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('email, role, full_name')
    .ilike('email', normalized)
    .maybeSingle();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('[Staff password reset] Profile lookup failed:', profileError.message);
    return {
      success: false,
      status: 500,
      error: 'Could not send the reset email. Try again in a few minutes.',
    };
  }

  if (!profile || !isStaffRole(profile.role)) {
    return { success: true };
  }

  const lastSent = recentResets.get(normalized);
  if (lastSent && Date.now() - lastSent < RESET_COOLDOWN_MS) {
    return { success: true };
  }

  const adminUrl = getAdminFrontendUrl(requestedOrigin);
  const redirectTo = `${adminUrl}/reset-password`;

  let linkResult = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: normalized,
    options: { redirectTo },
  });

  if (linkResult.error && /redirect/i.test(linkResult.error.message)) {
    linkResult = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: normalized,
    });
  }

  const hashedToken = linkResult.data?.properties?.hashed_token;
  if (linkResult.error || !hashedToken) {
    console.error(
      '[Staff password reset] Could not create reset link:',
      linkResult.error?.message || 'missing token'
    );
    return {
      success: false,
      status: 500,
      error: 'Could not send the reset email. Try again in a few minutes.',
    };
  }

  const params = new URLSearchParams({
    token_hash: hashedToken,
    type: 'recovery',
  });
  const resetLink = `${redirectTo}?${params.toString()}`;
  const name = profile.full_name?.trim() || 'there';
  const safeName = escapeHtml(name);
  const safeLink = escapeHtml(resetLink);

  const subject = 'Reset your Pollean admin password';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #2e2e2e; max-width: 560px;">
      <h1 style="font-size: 20px;">Reset your password</h1>
      <p>Hello ${safeName},</p>
      <p>We received a request to reset the password for your Pollean system admin account.</p>
      <p>
        <a href="${safeLink}" style="display: inline-block; padding: 12px 20px; background: #ffc15e; color: #2e2e2e; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Choose a new password
        </a>
      </p>
      <p>Or copy this link into your browser:</p>
      <p style="word-break: break-all;">${safeLink}</p>
      <p>This link expires in 1 hour. Open it, choose Continue, then set your password. If you did not ask for this, you can ignore this email.</p>
    </div>
  `;
  const textBody = `Hello ${name},

We received a request to reset the password for your Pollean system admin account.

Choose a new password: ${resetLink}

This link expires in 1 hour. Open it, choose Continue, then set your password. If you did not ask for this, you can ignore this email.`;

  const sent = await postmarkService.sendEmail(
    profile.email || normalized,
    subject,
    htmlBody,
    textBody,
    'staff-password-reset'
  );

  if (!sent.success) {
    console.error('[Staff password reset] Email failed:', sent.error);
    return {
      success: false,
      status: 500,
      error: 'Could not send the reset email. Try again in a few minutes.',
    };
  }

  recentResets.set(normalized, Date.now());
  return { success: true };
}
