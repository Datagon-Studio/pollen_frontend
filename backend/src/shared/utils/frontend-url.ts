import { env } from '../../env.js';

/** Canonical production app URL for auth redirects and email links. */
export const CANONICAL_FRONTEND_URL = 'https://app.pollean.com';

/** Canonical production System Admin Portal URL. */
export const CANONICAL_ADMIN_URL = 'https://admin.pollean.com';

/**
 * Origin for staff password-reset links.
 * In development, a localhost browser origin is kept so the link matches the running admin app.
 * Production ignores the request origin and uses the configured admin URL.
 */
export function getAdminFrontendUrl(requestedOrigin?: string | null): string {
  const configured = (env.ADMIN_FRONTEND_URL || CANONICAL_ADMIN_URL).replace(/\/$/, '');

  if (env.NODE_ENV === 'development' && requestedOrigin) {
    try {
      const url = new URL(requestedOrigin);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return url.origin;
      }
    } catch {
      // Ignore a malformed origin and use the configured admin URL.
    }
  }

  if (
    configured.includes('localhost') ||
    configured.includes('127.0.0.1') ||
    configured.includes('vercel.app')
  ) {
    return env.NODE_ENV === 'development' ? configured : CANONICAL_ADMIN_URL;
  }

  return configured;
}

/**
 * Resolve frontend base URL for emails (verification, collector welcome, etc.).
 * Production always prefers a non-localhost / non-vercel URL, falling back to app.pollean.com.
 */
export function getFrontendUrl(baseUrl?: string | null): string {
  const candidates = [env.FRONTEND_URL, baseUrl].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const url = candidate.replace(/\/$/, '');
    if (env.NODE_ENV === 'development') {
      return url;
    }
    // Skip stale / local hosts in production
    if (
      url.includes('localhost') ||
      url.includes('127.0.0.1') ||
      url.includes('vercel.app')
    ) {
      continue;
    }
    return url;
  }

  if (env.NODE_ENV === 'development') {
    return env.FRONTEND_URL.replace(/\/$/, '') || 'http://localhost:8080';
  }

  return CANONICAL_FRONTEND_URL;
}
