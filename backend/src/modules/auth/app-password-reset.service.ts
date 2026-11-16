import { supabase } from '../../shared/supabase/client.js';
import { postmarkService } from '../../shared/services/postmark.service.js';
import { getFrontendUrl } from '../../shared/utils/frontend-url.js';
import { renderBrandedEmail } from '../../shared/utils/email-html.js';

const RESET_COOLDOWN_MS = 60_000;
const recentResets = new Map<string, number>();

export type AppPasswordResetResult =
  | { success: true }
  | { success: false; status: number; error: string };

/**
 * Send an app (group portal) password-reset email through Postmark.
 * Uses token_hash links so scanners do not consume Supabase action_link OTPs.
 * Unknown addresses get the same success response.
 */
export async function requestAppPasswordReset(
  email: string,
  requestedOrigin?: string | null
): Promise<AppPasswordResetResult> {
  const normalized = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { success: false, status: 400, error: 'Enter a valid email address.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('email, full_name')
    .ilike('email', normalized)
    .maybeSingle();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('[App password reset] Profile lookup failed:', profileError.message);
    return {
      success: false,
      status: 500,
      error: 'Could not send the reset email. Try again in a few minutes.',
    };
  }

  if (!profile) {
    return { success: true };
  }

  const lastSent = recentResets.get(normalized);
  if (lastSent && Date.now() - lastSent < RESET_COOLDOWN_MS) {
    return { success: true };
  }

  const frontendUrl = getFrontendUrl(requestedOrigin);
  const redirectTo = `${frontendUrl}/reset-password`;

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
      '[App password reset] Could not create reset link:',
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
  const resetLink = `${frontendUrl}/reset-password?${params.toString()}`;
  const name = profile.full_name?.trim() || 'there';

  const subject = 'Reset your Pollean password';
  const { html, text } = renderBrandedEmail({
    preheader: 'Choose a new password for your Pollean account.',
    title: 'Reset your password',
    greeting: name,
    paragraphs: [
      'We received a request to reset the password for your Pollean account.',
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
    'app-password-reset'
  );

  if (!sent.success) {
    console.error('[App password reset] Email failed:', sent.error);
    return {
      success: false,
      status: 500,
      error: 'Could not send the reset email. Try again in a few minutes.',
    };
  }

  recentResets.set(normalized, Date.now());
  return { success: true };
}
