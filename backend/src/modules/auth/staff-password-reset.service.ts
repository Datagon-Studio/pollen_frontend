import { supabase } from '../../shared/supabase/client.js';
import { postmarkService } from '../../shared/services/postmark.service.js';
import { isStaffRole } from '../../shared/middleware/staff.middleware.js';
import {
  buildAdminPasswordSetupLink,
  getAdminFrontendUrl,
} from '../../shared/utils/frontend-url.js';
import { renderBrandedEmail } from '../../shared/utils/email-html.js';

const RESET_COOLDOWN_MS = 60_000;
const recentResets = new Map<string, number>();

export type StaffPasswordResetResult =
  | { success: true }
  | { success: false; status: number; error: string };

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

  const resetLink = buildAdminPasswordSetupLink(hashedToken, 'recovery', requestedOrigin);
  const name = profile.full_name?.trim() || 'there';

  const subject = 'Reset your Pollean admin password';
  const { html, text } = renderBrandedEmail({
    preheader: 'Choose a new password for the Pollean admin portal.',
    title: 'Reset your admin password',
    greeting: name,
    paragraphs: [
      'We received a request to reset the password for your Pollean system admin account.',
      'Click the button below to choose a new password. For your security, open the link and tap <strong>Continue</strong> before setting it.',
    ],
    ctaLabel: 'Choose a new password',
    ctaUrl: resetLink,
    footerNote:
      'This link expires in 1 hour. If you did not ask for a password reset, you can ignore this email.',
  });

  const sent = await postmarkService.sendEmail(
    profile.email || normalized,
    subject,
    html,
    text,
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
