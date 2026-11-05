import { env } from '../../env.js';

/** Canonical production app URL for auth redirects and email links. */
export const CANONICAL_FRONTEND_URL = 'https://app.pollean.com';

/** Canonical production System Admin Portal URL (custom domain; DNS may lag). */
export const CANONICAL_ADMIN_URL = 'https://admin.pollean.com';

/**
 * Current Vercel production host for the admin portal.
 * Used when the custom domain is configured but not resolvable, or unset.
 */
export const ADMIN_VERCEL_URL = 'https://pollen-admin.vercel.app';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Origins we may send staff to for password setup / sign-in.
 * Rejects arbitrary hosts so email bridge query params cannot open-redirect.
 */
export function isAllowedAdminOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (isLocalHost(url.hostname)) return true;
    if (url.hostname === 'admin.pollean.com') return true;
    // Production + Preview Vercel hosts for the admin portal
    if (
      url.hostname === 'pollen-admin.vercel.app' ||
      (url.hostname.endsWith('.vercel.app') && url.hostname.startsWith('pollen-admin'))
    ) {
      return true;
    }

    const configured = stripTrailingSlash(env.ADMIN_FRONTEND_URL || '');
    if (configured) {
      try {
        if (url.origin === new URL(configured).origin) return true;
      } catch {
        // Ignore malformed ADMIN_FRONTEND_URL.
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Origin for staff invite / password-reset links.
 * Prefers the admin portal Origin that triggered the request when trusted,
 * then ADMIN_FRONTEND_URL (including *.vercel.app), then a working fallback.
 */
export function getAdminFrontendUrl(requestedOrigin?: string | null): string {
  if (requestedOrigin && isAllowedAdminOrigin(requestedOrigin)) {
    const origin = new URL(requestedOrigin).origin;
    // admin.pollean.com is allowed for config, but DNS is not reliable yet.
    if (new URL(origin).hostname !== 'admin.pollean.com') {
      return origin;
    }
  }

  const configured = stripTrailingSlash(env.ADMIN_FRONTEND_URL || '');

  if (configured) {
    try {
      const host = new URL(configured).hostname;
      if (isLocalHost(host)) {
        if (env.NODE_ENV === 'development') return configured;
      } else if (host === 'admin.pollean.com') {
        // Custom domain is the long-term target but is often unset in DNS.
        // Prefer the live Vercel host until admin.pollean.com resolves.
        return ADMIN_VERCEL_URL;
      } else {
        return configured;
      }
    } catch {
      // Fall through to defaults.
    }
  }

  if (env.NODE_ENV === 'development') {
    return configured || 'http://localhost:8081';
  }

  return ADMIN_VERCEL_URL;
}

/**
 * Public API base used in emails (always a host that resolves).
 * Production: https://app.pollean.com/api/v1
 */
export function getPublicApiBaseUrl(): string {
  const frontend = getFrontendUrl();
  return `${frontend}/api/v1`;
}

/**
 * Staff invite / reset link for the admin portal.
 * Points at the live admin host (request origin, ADMIN_FRONTEND_URL, or Vercel).
 * Does not use app.pollean.com as a bridge — production may lag development
 * and would 404 the bridge route; admin.pollean.com DNS is also unreliable.
 */
export function buildAdminPasswordSetupLink(
  tokenHash: string,
  type: 'recovery' | 'invite' = 'recovery',
  requestedOrigin?: string | null
): string {
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type,
  });
  const portal = getAdminFrontendUrl(requestedOrigin).replace(/\/$/, '');
  return `${portal}/reset-password?${params.toString()}`;
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
