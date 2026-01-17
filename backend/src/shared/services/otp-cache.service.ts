/**
 * OTP Cache Service
 * 
 * In-memory cache for OTP codes with expiry
 * In production, consider using Redis for distributed systems
 */

interface OTPEntry {
  code: string;
  phone: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

class OTPCacheService {
  private cache: Map<string, OTPEntry> = new Map();
  private readonly MAX_ATTEMPTS = 3;
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute

  constructor() {
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * Store OTP code
   */
  set(phone: string, code: string, expiryMinutes: number = 5): void {
    const key = this.normalizePhone(phone);
    const expiresAt = Date.now() + expiryMinutes * 60 * 1000;

    this.cache.set(key, {
      code,
      phone,
      expiresAt,
      attempts: 0,
      verified: false,
    });
  }

  /**
   * Verify OTP code
   */
  verify(phone: string, code: string): boolean {
    const key = this.normalizePhone(phone);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    // Check if already verified
    if (entry.verified) {
      return false;
    }

    // Check attempts
    if (entry.attempts >= this.MAX_ATTEMPTS) {
      this.cache.delete(key);
      return false;
    }

    entry.attempts++;

    // Verify code
    if (entry.code === code) {
      entry.verified = true;
      // Keep entry for a short time to prevent replay attacks
      setTimeout(() => this.cache.delete(key), 60000); // 1 minute
      return true;
    }

    return false;
  }

  /**
   * Get OTP entry (for debugging/admin)
   */
  get(phone: string): OTPEntry | null {
    const key = this.normalizePhone(phone);
    const entry = this.cache.get(key);

    if (!entry || Date.now() > entry.expiresAt) {
      return null;
    }

    return entry;
  }

  /**
   * Remove OTP entry
   */
  delete(phone: string): void {
    const key = this.normalizePhone(phone);
    this.cache.delete(key);
  }

  /**
   * Check if OTP exists and is valid
   */
  exists(phone: string): boolean {
    const key = this.normalizePhone(phone);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Normalize phone number for consistent key
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/[\s\-+]/g, '');
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export const otpCache = new OTPCacheService();
