import { env } from '../../env.js';

/** Canonical production app URL for auth redirects and email links. */
export const CANONICAL_FRONTEND_URL = 'https://app.pollean.com';

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
