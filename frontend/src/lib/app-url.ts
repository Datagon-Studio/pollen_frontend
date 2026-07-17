/**
 * Canonical production app URL for auth redirects and email links.
 */
export const CANONICAL_APP_URL = "https://app.pollean.com";

/**
 * Resolve the app origin for password-reset / verification redirects.
 * Prefer VITE_APP_URL, then current origin (unless it's an old host), else canonical.
 */
export function getAppUrl(): string {
  const configured = import.meta.env.VITE_APP_URL as string | undefined;
  if (configured?.trim()) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("app.pollean.com")
    ) {
      return origin;
    }
    // Old Vercel / other hosts → force canonical domain
    return CANONICAL_APP_URL;
  }

  return CANONICAL_APP_URL;
}
