/**
 * Domain split:
 * - Marketing site: pollean.com (and www)
 * - Product app: app.pollean.com
 *
 * Local/preview: set VITE_SITE_MODE=marketing to serve the landing at `/`.
 */

export const CANONICAL_MARKETING_URL = "https://pollean.com";
export { CANONICAL_APP_URL, getAppUrl } from "./app-url";

export type SiteMode = "marketing" | "app";

export function getSiteMode(): SiteMode {
  const configured = import.meta.env.VITE_SITE_MODE as string | undefined;
  if (configured === "marketing" || configured === "app") {
    return configured;
  }

  if (typeof window === "undefined") {
    return "app";
  }

  const host = window.location.hostname.toLowerCase();
  if (host === "pollean.com" || host === "www.pollean.com") {
    return "marketing";
  }

  return "app";
}

export function isMarketingHost(): boolean {
  return getSiteMode() === "marketing";
}

export function getMarketingUrl(): string {
  const configured = import.meta.env.VITE_MARKETING_URL as string | undefined;
  if (configured?.trim()) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("pollean.com")
    ) {
      // On app subdomain, still point marketing links at the apex domain in prod
      if (origin.includes("app.pollean.com")) {
        return CANONICAL_MARKETING_URL;
      }
      return origin;
    }
  }

  return CANONICAL_MARKETING_URL;
}
