/**
 * Bitly Link Shortening Service
 *
 * Shortens long URLs via Bitly API v4.
 * Returns null on missing config or API failure (caller should fall back).
 */

import { env } from '../../env.js';

interface BitlyShortenResponse {
  link?: string;
  message?: string;
}

class BitlyService {
  private readonly apiBaseUrl = 'https://api-ssl.bitly.com/v4';

  /**
   * Shorten a long URL. Returns the Bitly link, or null if unavailable.
   */
  async shortenUrl(longUrl: string): Promise<string | null> {
    const accessToken = env.BITLY_ACCESS_TOKEN;
    if (!accessToken) {
      console.warn('[Bitly] BITLY_ACCESS_TOKEN not set; skipping shorten');
      return null;
    }

    try {
      const body: Record<string, string> = {
        long_url: longUrl,
        domain: env.BITLY_DOMAIN || 'bit.ly',
      };

      if (env.BITLY_GROUP_GUID) {
        body.group_guid = env.BITLY_GROUP_GUID;
      }

      const response = await fetch(`${this.apiBaseUrl}/shorten`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as BitlyShortenResponse;

      if (!response.ok || !data.link) {
        console.error(
          '[Bitly] Failed to shorten URL:',
          response.status,
          data.message || data
        );
        return null;
      }

      return data.link;
    } catch (error) {
      console.error('[Bitly] Error shortening URL:', error);
      return null;
    }
  }
}

export const bitlyService = new BitlyService();
