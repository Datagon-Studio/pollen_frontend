/**
 * Member Routes
 * 
 * Defines routes for the member module.
 */

import { Router, Request, Response } from 'express';
import { memberRoutes } from './member.controller.js';
import { authenticateToken, AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { arkeselService } from '../../shared/services/arkesel.service.js';
import { memberService } from './member.service.js';
import { accountService } from '../account/account.service.js';
import { postmarkService } from '../../shared/services/postmark.service.js';
import { otpRepository } from '../otp/otp.repository.js';
import { env } from '../../env.js';
import crypto from 'crypto';

export const memberRoutesWithAuth = Router();

// Temporary store for verified phone numbers (expires after 10 minutes)
// Format: `${accountId}:${normalizedPhone}` -> timestamp
const verifiedPhones = new Map<string, number>();
const VERIFICATION_EXPIRY = 10 * 60 * 1000; // 10 minutes

// Helper to normalize phone number
const normalizePhone = (phone: string): string => {
  return phone.replace(/[\s\-+]/g, '');
};

// Helper to check if phone is verified
const isPhoneVerified = (accountId: string, phone: string): boolean => {
  const key = `${accountId}:${normalizePhone(phone)}`;
  const timestamp = verifiedPhones.get(key);
  if (!timestamp) return false;
  
  // Check if verification has expired
  if (Date.now() - timestamp > VERIFICATION_EXPIRY) {
    verifiedPhones.delete(key);
    return false;
  }
  
  return true;
};

// Helper to mark phone as verified
const markPhoneVerified = (accountId: string, phone: string): void => {
  const key = `${accountId}:${normalizePhone(phone)}`;
  verifiedPhones.set(key, Date.now());
};

// Temporary store for verified email addresses (expires after 10 minutes)
const verifiedEmails = new Map<string, number>();

// Helper to check if email is verified
const isEmailVerified = (accountId: string, email: string): boolean => {
  const key = `${accountId}:${email.toLowerCase().trim()}`;
  const timestamp = verifiedEmails.get(key);
  if (!timestamp) return false;
  
  if (Date.now() - timestamp > VERIFICATION_EXPIRY) {
    verifiedEmails.delete(key);
    return false;
  }
  
  return true;
};

// Helper to mark email as verified
const markEmailVerified = (accountId: string, email: string): void => {
  const key = `${accountId}:${email.toLowerCase().trim()}`;
  verifiedEmails.set(key, Date.now());
};

// Helper to generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Public routes (no auth required) - MUST be before auth middleware

// GET /api/v1/members/test-otp - Test Arkesel configuration (public)
memberRoutesWithAuth.get('/test-otp', async (req: Request, res: Response) => {
  const apiKey = process.env.ARKESEL_API_KEY;
  const hasApiKey = !!apiKey;
  const apiKeyPreview = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET';
  
  res.status(200).json({
    success: true,
    config: {
      hasApiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPreview,
      baseUrl: 'https://sms.arkesel.com',
      endpoint: '/api/otp/generate',
    },
    message: hasApiKey 
      ? 'Arkesel API key is configured. Check logs when sending OTP.' 
      : '⚠️ ARKESEL_API_KEY is not set in environment variables!',
  });
});

// POST /api/v1/members/otp/send - Send OTP (public)
// IMPORTANT: This route MUST be defined BEFORE authenticateToken middleware
memberRoutesWithAuth.post('/otp/send', async (req: Request, res: Response) => {
  console.log('[OTP Send] Route hit:', req.body);
  try {
    const { phone, accountId } = req.body;

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required',
      });
    }

    // Validate UUID format for accountId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID format',
      });
    }

    const members = await memberService.getMembersByAccount(accountId);
    
    // Normalize phone: remove spaces, dashes, plus, parentheses
    // For Ghana numbers: convert +233 to 0, keep leading 0 for 10-digit numbers
    const normalizePhone = (phoneNum: string): string => {
      let normalized = phoneNum.replace(/[\s\-+()]/g, '');
      // If starts with 233 (country code), replace with 0
      if (normalized.startsWith('233') && normalized.length === 12) {
        normalized = '0' + normalized.substring(3);
      }
      // Keep leading 0 for 10-digit numbers (Ghana format)
      return normalized;
    };
    
    const normalizedPhone = normalizePhone(phone.trim());
    const member = members.find(m => {
      const memberPhone = normalizePhone(m.phone);
      return memberPhone === normalizedPhone || memberPhone.endsWith(normalizedPhone) || normalizedPhone.endsWith(memberPhone);
    });

    if (!member) {
      console.error(`[OTP Send] Member not found. Phone: ${phone}, Normalized: ${normalizedPhone}, Account: ${accountId}, Total members: ${members.length}`);
      if (members.length > 0) {
        console.error(`[OTP Send] Sample member phones: ${members.slice(0, 3).map(m => `${m.phone} (normalized: ${normalizePhone(m.phone)})`).join(', ')}`);
      }
      return res.status(404).json({
        success: false,
        error: 'Member not found with this phone number',
      });
    }

    const result = await arkeselService.sendOTP(
      phone,
      'Your Pollean verification code is %otp_code%. Valid for %expiry% minutes.',
      5,
      6
    );

    if (!result.success) {
      console.error('Failed to send public OTP:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send OTP. Please try again later.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      ussd_code: result.ussdCode,
    });
  } catch (error) {
    console.error('Exception sending public OTP:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send OTP',
    });
  }
});

// POST /api/v1/members/otp/verify - Verify OTP (public)
memberRoutesWithAuth.post('/otp/verify', async (req: Request, res: Response) => {
  console.log('[OTP Verify] Route hit:', { phone: req.body.phone, accountId: req.body.accountId, codeLength: req.body.code?.length });
  try {
    const { phone, code, accountId } = req.body;

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        error: 'OTP code is required',
      });
    }

    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required',
      });
    }

    // Validate UUID format for accountId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID format',
      });
    }

    // Validate OTP code format (numeric, 6-15 digits)
    if (!/^\d{6,15}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP code format',
      });
    }

    const verifyResult = await arkeselService.verifyOTP(phone, code);

    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP code',
      });
    }

    const members = await memberService.getMembersByAccount(accountId);
    
    // Normalize phone: remove spaces, dashes, plus, parentheses
    // For Ghana numbers: convert +233 to 0, keep leading 0 for 10-digit numbers
    const normalizePhone = (phoneNum: string): string => {
      let normalized = phoneNum.replace(/[\s\-+()]/g, '');
      // If starts with 233 (country code), replace with 0
      if (normalized.startsWith('233') && normalized.length === 12) {
        normalized = '0' + normalized.substring(3);
      }
      // Keep leading 0 for 10-digit numbers (Ghana format)
      return normalized;
    };
    
    const normalizedPhone = normalizePhone(phone.trim());
    const member = members.find(m => {
      const memberPhone = normalizePhone(m.phone);
      return memberPhone === normalizedPhone || memberPhone.endsWith(normalizedPhone) || normalizedPhone.endsWith(memberPhone);
    });

    if (!member) {
      console.error(`[OTP Verify] Member not found. Phone: ${phone}, Normalized: ${normalizedPhone}, Account: ${accountId}, Total members: ${members.length}`);
      if (members.length > 0) {
        console.error(`[OTP Verify] Sample member phones: ${members.slice(0, 3).map(m => `${m.phone} (normalized: ${normalizePhone(m.phone)})`).join(', ')}`);
      }
      return res.status(404).json({
        success: false,
        error: 'Member not found',
      });
    }

    // Persist phone verification for members who were added without OTP
    let verifiedMember = member;
    if (!member.phone_verified) {
      const baseUrl = req.headers.origin ||
                      (req.headers.referer ? new URL(req.headers.referer).origin : null) ||
                      process.env.FRONTEND_URL;
      verifiedMember = await memberService.verifyPhone(member.member_id, baseUrl);
      console.log(`[OTP Verify] Marked phone verified for member ${member.member_id}`);
    }

    // Auto-link anonymous Paystack contributions to this member
    try {
      const { paymentService } = await import('../../modules/payment/payment.service.js');
      await paymentService.linkAnonymousContributions(accountId, verifiedMember.member_id);
    } catch (error) {
      console.error('Error auto-linking contributions:', error);
      // Don't fail OTP verification if linking fails
    }

    res.status(200).json({
      success: true,
      data: {
        member_id: verifiedMember.member_id,
        full_name: verifiedMember.full_name,
        phone_verified: verifiedMember.phone_verified,
      },
      message: 'OTP verified successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to verify OTP',
    });
  }
});

// POST /api/v1/members/register-otp/send - Send OTP for new member registration (public)
memberRoutesWithAuth.post('/register-otp/send', async (req: Request, res: Response) => {
  console.log('[Register OTP Send] Route hit:', req.body);
  try {
    const { phone, accountId } = req.body;

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required',
      });
    }

    // Validate UUID format for accountId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID format',
      });
    }

    // Check if member with this phone already exists in this account
    const members = await memberService.getMembersByAccount(accountId);
    const normalizedPhone = phone.replace(/[\s\-+]/g, '');
    const existingMember = members.find(m => {
      const memberPhone = m.phone.replace(/[\s\-+]/g, '');
      return memberPhone === normalizedPhone;
    });
    
    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: 'A member with this phone number already exists',
      });
    }

    const result = await arkeselService.sendOTP(
      phone,
      'Your Pollean verification code is %otp_code%. Valid for %expiry% minutes.',
      5,
      6
    );

    if (!result.success) {
      console.error('Failed to send registration OTP:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send OTP. Please try again later.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      ussd_code: result.ussdCode,
    });
  } catch (error) {
    console.error('Exception sending registration OTP:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send OTP',
    });
  }
});

// POST /api/v1/members/register-otp/verify - Verify OTP for new member registration (public)
memberRoutesWithAuth.post('/register-otp/verify', async (req: Request, res: Response) => {
  console.log('[Register OTP Verify] Route hit:', req.body);
  try {
    const { phone, code, accountId } = req.body;

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        error: 'OTP code is required',
      });
    }

    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required',
      });
    }

    // Validate UUID format for accountId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID format',
      });
    }

    // Verify OTP with Arkesel
    const result = await arkeselService.verifyOTP(phone, code);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Invalid or expired OTP code',
      });
    }

    // Mark phone as verified for this account (valid for 10 minutes)
    markPhoneVerified(accountId, phone);
    const normalizedPhoneValue = normalizePhone(phone);
    console.log(`[Register OTP Verify] Phone verified and stored: ${accountId}:${normalizedPhoneValue}`);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.error('Exception verifying registration OTP:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify OTP',
    });
  }
});

// POST /api/v1/members/register-email-otp/send - Send email OTP for new member registration (public)
memberRoutesWithAuth.post('/register-email-otp/send', async (req: Request, res: Response) => {
  console.log('[Register Email OTP Send] Route hit:', req.body);
  try {
    const { email, accountId } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required',
      });
    }

    // Validate UUID format for accountId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID format',
      });
    }

    // Check if member with this email already exists in this account
    const members = await memberService.getMembersByAccount(accountId);
    const normalizedEmail = email.toLowerCase().trim();
    const existingMember = members.find(m => 
      m.email && m.email.toLowerCase().trim() === normalizedEmail
    );
    
    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: 'A member with this email address already exists',
      });
    }

    // Generate OTP code
    const otpCode = generateOTP();
    
    // Store OTP in database
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes expiry

    try {
      await otpRepository.create({
        account_id: accountId,
        identifier: normalizedEmail,
        identifier_type: 'email',
        otp_code: otpCode,
        expires_at: expiresAt,
        max_attempts: 3,
      });
      console.log(`[Register Email OTP Send] OTP stored in database for ${normalizedEmail}`);
    } catch (dbError) {
      console.error('[Register Email OTP Send] Failed to store OTP in database:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate OTP. Please try again.',
      });
    }

    // Send OTP via email
    const emailSubject = 'Your Pollean Verification Code';
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .otp-code { font-size: 32px; font-weight: bold; color: #f59e0b; text-align: center; padding: 20px; background-color: #fef3c7; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Email Verification Code</h2>
          <p>Hello,</p>
          <p>Your verification code for Pollean is:</p>
          <div class="otp-code">${otpCode}</div>
          <p>This code will expire in 5 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <div class="footer">
            <p>Best regards,<br>The Pollean Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await postmarkService.sendEmail(
      email.trim(),
      emailSubject,
      emailBody,
      `Your Pollean verification code is ${otpCode}. This code will expire in 5 minutes.`,
      'email-otp'
    );

    if (!result.success) {
      console.error('Failed to send email OTP:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send OTP. Please try again later.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email',
    });
  } catch (error) {
    console.error('Exception sending email OTP:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send OTP',
    });
  }
});

// POST /api/v1/members/register-email-otp/verify - Verify email OTP for new member registration (public)
memberRoutesWithAuth.post('/register-email-otp/verify', async (req: Request, res: Response) => {
  console.log('[Register Email OTP Verify] Route hit:', req.body);
  try {
    const { email, code, accountId } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required',
      });
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        error: 'OTP code is required',
      });
    }

    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required',
      });
    }

    // Validate UUID format for accountId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID format',
      });
    }

    // Verify OTP from database
    const normalizedEmail = email.toLowerCase().trim();
    const isValid = await otpRepository.verify(
      accountId,
      normalizedEmail,
      'email',
      code.trim()
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP code. Please request a new code.',
      });
    }

    // Mark email as verified for this account (valid for 10 minutes)
    markEmailVerified(accountId, email);
    console.log(`[Register Email OTP Verify] Email verified and stored: ${accountId}:${normalizedEmail}`);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Exception verifying email OTP:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify OTP',
    });
  }
});

// POST /api/v1/members/verify-email-token - Verify email via token (public)
memberRoutesWithAuth.post('/verify-email-token', async (req: Request, res: Response) => {
  console.log('[Verify Email Token] Route hit');
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required',
      });
    }

    // Decode token
    let decoded: string;
    try {
      decoded = Buffer.from(token, 'base64url').toString('utf-8');
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token format',
      });
    }

    const parts = decoded.split(':');
    if (parts.length !== 3) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token format',
      });
    }

    const [memberId, timestamp, tokenHash] = parts;
    const tokenTimestamp = parseInt(timestamp, 10);

    // Check if token is expired (24 hours)
    const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - tokenTimestamp > TOKEN_EXPIRY) {
      return res.status(400).json({
        success: false,
        error: 'Verification token has expired',
      });
    }

    // Get member to verify token
    const member = await memberService.getMember(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found',
      });
    }

    if (!member.email) {
      return res.status(400).json({
        success: false,
        error: 'Member does not have an email address',
      });
    }

    // Verify token hash
    const secret = env.EMAIL_VERIFICATION_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        error: 'Email verification secret not configured',
      });
    }
    const tokenData = `${memberId}:${member.email}:${timestamp}`;
    const expectedHash = crypto
      .createHash('sha256')
      .update(tokenData + secret)
      .digest('hex');

    if (tokenHash !== expectedHash) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification token',
      });
    }

    // Verify the email
    const verifiedMember = await memberService.verifyEmail(memberId);

    res.status(200).json({
      success: true,
      data: verifiedMember,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Exception verifying email token:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify email',
    });
  }
});

// POST /api/v1/members/register - Create new member (public - for join page)
memberRoutesWithAuth.post('/register', async (req: Request, res: Response) => {
  console.log('[Register Member] Route hit:', req.body);
  try {
    const { accountId, full_name, phone, dob, email, membership_number } = req.body;

    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required',
      });
    }

    // Validate UUID format for accountId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID format',
      });
    }

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Full name is required',
      });
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    // Check if phone was verified recently (within last 10 minutes)
    const normalizedPhoneForCheck = normalizePhone(phone);
    const verificationKey = `${accountId}:${normalizedPhoneForCheck}`;
    const isVerified = isPhoneVerified(accountId, phone);
    
    console.log(`[Register Member] Checking verification for key: ${verificationKey}`);
    console.log(`[Register Member] Is verified: ${isVerified}`);
    console.log(`[Register Member] Verified phones map size: ${verifiedPhones.size}`);
    console.log(`[Register Member] All verified keys:`, Array.from(verifiedPhones.keys()));
    
    if (!isVerified) {
      return res.status(400).json({
        success: false,
        error: 'Phone number must be verified before registration. Please verify your phone number first.',
      });
    }

    // Check if member with this phone already exists in this account
    const members = await memberService.getMembersByAccount(accountId);
    const normalizedPhoneForMember = normalizePhone(phone);
    const existingMember = members.find(m => {
      const memberPhone = normalizePhone(m.phone);
      return memberPhone === normalizedPhoneForMember;
    });
    
    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: 'A member with this phone number already exists',
      });
    }

    // Create the member
    const member = await memberService.createMember({
      account_id: accountId,
      full_name: full_name.trim(),
      dob: dob || null,
      phone: phone.trim(),
      phone_verified: true, // Verified via OTP
      email: email?.trim() || null,
      email_verified: email?.trim() ? isEmailVerified(accountId, email.trim()) : false,
      membership_number: membership_number?.trim() || null,
    });

    // Automatically send verification email if email is provided
    if (member.email) {
      try {
        // Get base URL dynamically from request headers or environment
        const baseUrl = req.headers.origin || 
                        (req.headers.referer ? new URL(req.headers.referer).origin : null) ||
                        process.env.FRONTEND_URL;
        await memberService.sendVerificationEmail(member.member_id, baseUrl);
        console.log(`[Register Member] Verification email sent to ${member.email}`);
      } catch (emailError) {
        // Don't fail registration if email sending fails, just log it
        console.error('[Register Member] Failed to send verification email:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      data: member,
      message: 'Member registered successfully',
    });
  } catch (error) {
    console.error('Exception registering member:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register member',
    });
  }
});

// Admin-only routes for member creation (before member exists)
// These require authentication but don't need an existing member
// NOTE: These routes are defined BEFORE the auth middleware below, so we apply auth inline

// POST /api/v1/members/verify-phone/send - Send OTP for phone verification during member creation (admin only)
memberRoutesWithAuth.post('/verify-phone/send', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { phone, accountId } = req.body;

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required',
      });
    }

    // Validate UUID format for accountId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID format',
      });
    }

    // Verify user has access to this account
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Verify user has access to this account
    const userAccount = await accountService.getUserAccount(userId);
    if (!userAccount || userAccount.account_id !== accountId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Check if member with this phone already exists in this account
    const members = await memberService.getMembersByAccount(accountId);
    const normalizedPhone = phone.replace(/[\s\-+]/g, '');
    const existingMember = members.find(m => {
      const memberPhone = m.phone.replace(/[\s\-+]/g, '');
      return memberPhone === normalizedPhone;
    });
    
    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: 'A member with this phone number already exists',
      });
    }

    const result = await arkeselService.sendOTP(
      phone,
      'Your Pollean verification code is %otp_code%. Valid for %expiry% minutes.',
      5,
      6
    );

    if (!result.success) {
      console.error('Failed to send OTP for phone verification:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send OTP. Please try again later.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      ussd_code: result.ussdCode,
    });
  } catch (error) {
    console.error('Exception sending OTP for phone verification:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send OTP',
    });
  }
});

// POST /api/v1/members/verify-phone/verify - Verify OTP for phone verification during member creation (admin only)
memberRoutesWithAuth.post('/verify-phone/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { phone, code, accountId } = req.body;

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        error: 'OTP code is required',
      });
    }

    if (!accountId || typeof accountId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required',
      });
    }

    // Validate UUID format for accountId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID format',
      });
    }

    // Validate OTP code format (numeric, 6-15 digits)
    if (!/^\d{6,15}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP code format',
      });
    }

    // Verify user has access to this account
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Verify user has access to this account
    const userAccount = await accountService.getUserAccount(userId);
    if (!userAccount || userAccount.account_id !== accountId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const verifyResult = await arkeselService.verifyOTP(phone, code);

    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP code',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to verify OTP',
    });
  }
});

// All other member routes require authentication
// IMPORTANT: Public routes above must be defined BEFORE this middleware

// Create a new router for authenticated routes to avoid conflicts
// We mount this AFTER the public routes to ensure public routes are matched first
const authenticatedMemberRoutes = Router();
authenticatedMemberRoutes.use(authenticateToken);
authenticatedMemberRoutes.use('/', memberRoutes);

// Mount authenticated routes AFTER public routes
// Express matches routes in order, so public routes defined above will be matched first
memberRoutesWithAuth.use('/', authenticatedMemberRoutes);


