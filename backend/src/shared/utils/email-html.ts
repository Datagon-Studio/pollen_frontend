/**
 * Shared HTML helpers for transactional emails.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const LOGO_URL = 'https://app.pollean.com/logos/Pollean-Wordmark-Black.png';
const BRAND_GOLD = '#ffc15e';
const TEXT = '#2e2e2e';
const MUTED = '#6b6b6b';
const BORDER = '#e8e8e8';
const BG = '#f7f5f2';

export type BrandedEmailContent = {
  preheader?: string;
  title: string;
  greeting?: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  footerNote?: string;
};

/**
 * Pollean-branded transactional email (table layout for client compatibility).
 * Pass already-escaped HTML in paragraphs, or plain text (escaped here for greeting only).
 */
export function renderBrandedEmail(content: BrandedEmailContent): { html: string; text: string } {
  const safeTitle = escapeHtml(content.title);
  const safeGreeting = content.greeting ? escapeHtml(content.greeting) : null;
  const safeCta = escapeHtml(content.ctaLabel);
  const safeUrl = escapeHtml(content.ctaUrl);
  const safePreheader = escapeHtml(content.preheader || content.title);
  const safeFooter = escapeHtml(
    content.footerNote ||
      "If you didn't request this, you can ignore this email. Your password will stay the same."
  );

  const paragraphHtml = content.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${TEXT};">${p}</p>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${safePreheader}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 12px;text-align:center;border-bottom:1px solid ${BORDER};">
              <img src="${LOGO_URL}" alt="Pollean" width="140" height="auto" style="display:inline-block;max-width:140px;height:auto;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;color:${TEXT};font-weight:700;">
                ${safeTitle}
              </h1>
              ${
                safeGreeting
                  ? `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${TEXT};">Hello ${safeGreeting},</p>`
                  : ''
              }
              <div style="font-family:Arial,Helvetica,sans-serif;">
                ${paragraphHtml}
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
                <tr>
                  <td style="border-radius:8px;background:${BRAND_GOLD};">
                    <a href="${safeUrl}" style="display:inline-block;padding:14px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${TEXT};text-decoration:none;">
                      ${safeCta}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${MUTED};">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;word-break:break-all;color:${MUTED};background:#fafafa;border:1px solid ${BORDER};border-radius:6px;padding:12px;">
                ${safeUrl}
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${MUTED};">
                ${safeFooter}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${BORDER};">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${MUTED};text-align:center;">
                Pollean · <a href="https://app.pollean.com" style="color:${MUTED};">app.pollean.com</a>
              </p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.4;color:#999;text-align:center;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textParts = [
    content.title,
    '',
    content.greeting ? `Hello ${content.greeting},` : null,
    '',
    ...content.paragraphs.map((p) => p.replace(/<[^>]*>/g, '')),
    '',
    `${content.ctaLabel}: ${content.ctaUrl}`,
    '',
    content.footerNote ||
      "If you didn't request this, you can ignore this email. Your password will stay the same.",
    '',
    'Pollean — https://app.pollean.com',
  ].filter((line) => line !== null) as string[];

  return { html, text: textParts.join('\n') };
}
