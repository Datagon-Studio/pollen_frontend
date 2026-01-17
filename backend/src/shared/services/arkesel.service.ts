/**
 * Arkesel SMS Service
 * 
 * Handles sending SMS OTP via Arkesel API
 */

interface SendOTPResponse {
  code: string; // Response code: "1000" = success
  ussd_code?: string;
  message?: string;
}

interface VerifyOTPResponse {
  code: string; // Response code: "1100" = success
  message?: string;
}

class ArkeselService {
  private apiKey: string;
  private baseUrl = 'https://sms.arkesel.com';

  constructor() {
    this.apiKey = process.env.ARKESEL_API_KEY || '';
    if (!this.apiKey) {
      console.error('❌ CRITICAL: ARKESEL_API_KEY not set in environment variables!');
    }
  }

  /**
   * Send OTP via SMS
   * @param phone Phone number with country code (e.g., 233241234567)
   * @param message Custom message template (use %otp_code% as placeholder)
   * @param expiry Expiry time in minutes (default: 5, max: 10)
   * @param length OTP length (default: 6, range: 6-15)
   */
  async sendOTP(
    phone: string,
    message?: string,
    expiry: number = 5,
    length: number = 6
  ): Promise<{ success: boolean; code?: string; messageId?: string; error?: string }> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Arkesel API key not configured',
      };
    }

    // Format phone number (remove spaces, dashes, plus signs)
    const formattedPhone = phone.replace(/[\s\-+]/g, '');

    // Default message template - Arkesel uses %otp_code% as placeholder
    const defaultMessage = `Your PollenHive verification code is %otp_code%. Valid for %expiry% minutes.`;
    const smsMessage = message || defaultMessage;

    // Ensure message contains %otp_code% placeholder (required by Arkesel)
    if (!smsMessage.includes('%otp_code%')) {
      return {
        success: false,
        error: 'Message must contain %otp_code% placeholder',
      };
    }

    const requestBody = {
      number: formattedPhone,
      sender_id: 'PollenHive',
      message: smsMessage,
      expiry: Math.min(Math.max(expiry, 1), 10), // Clamp between 1-10
      length: Math.min(Math.max(length, 6), 15), // Clamp between 6-15
      medium: 'sms',
      type: 'numeric',
    };

    const endpoint = `${this.baseUrl}/api/otp/generate`;

    try {
      // Exact format matching Arkesel documentation
      const response = await fetch('https://sms.arkesel.com/api/otp/generate', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();

      let data: SendOTPResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        return {
          success: false,
          error: 'Invalid response from OTP service',
        };
      }

      // Check response code
      if (data.code === '1000') {
        return {
          success: true,
          messageId: data.ussd_code,
        };
      }

      // Handle error codes
      const errorMessages: Record<string, string> = {
        '1001': 'Validation error - Missing required field',
        '1002': 'Message must contain %otp_code% placeholder',
        '1003': 'Sender ID blocked by administrator',
        '1004': 'SMS gateway not active or credential not found',
        '1005': 'Invalid phone number',
        '1006': 'OTP not allowed in your country',
        '1007': 'Insufficient balance',
        '1008': 'Insufficient balance',
        '1009': 'Cannot send more than 500 characters using voice medium',
        '1011': 'Internal error',
      };

      const errorMessage = errorMessages[data.code] || data.message || 'Failed to send OTP';
      
      return {
        success: false,
        error: errorMessage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }


  /**
   * Verify OTP code
   * @param phone Phone number with country code
   * @param code OTP code to verify
   */
  async verifyOTP(
    phone: string,
    code: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Arkesel API key not configured',
      };
    }

    // Format phone number
    const formattedPhone = phone.replace(/[\s\-+]/g, '');

    const requestBody = {
      number: formattedPhone,
      code: code,
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/otp/verify`, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();

      let data: VerifyOTPResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        return {
          success: false,
          error: 'Invalid response from OTP service',
        };
      }

      // Check response code - "1100" = success
      if (data.code === '1100') {
        return {
          success: true,
          message: data.message || 'OTP verified successfully',
        };
      }

      // Handle error codes
      const errorMessages: Record<string, string> = {
        '1101': 'Validation error - Missing required field',
        '1102': 'Invalid phone number',
        '1103': 'Invalid phone number',
        '1104': 'Invalid code',
        '1105': 'Code has expired',
        '1106': 'Internal error',
      };

      const errorMessage = errorMessages[data.code] || data.message || 'Invalid OTP code';

      return {
        success: false,
        error: errorMessage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }
}

export const arkeselService = new ArkeselService();
