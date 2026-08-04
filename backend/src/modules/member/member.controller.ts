/**
 * Member Controller
 * 
 * Handles Express req and res.
 * Calls service methods.
 * Converts thrown errors into HTTP responses.
 * No Supabase usage here.
 */

import { Router, Request, Response } from 'express';
import { memberService } from './member.service.js';
import { CreateMemberInput, UpdateMemberInput } from './member.entity.js';
import { AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { accountService } from '../account/account.service.js';
import { arkeselService } from '../../shared/services/arkesel.service.js';
import { otpCache } from '../../shared/services/otp-cache.service.js';
import { postmarkService } from '../../shared/services/postmark.service.js';
import { otpRepository } from '../otp/otp.repository.js';

export const memberRoutes = Router();

const generateEmailOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * GET /api/v1/members/test-otp
 * Test endpoint to verify Arkesel configuration
 */
memberRoutes.get('/test-otp', async (req: Request, res: Response) => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 [TEST] OTP Configuration Check');
  console.log('═══════════════════════════════════════════════════════');
  
  const apiKey = process.env.ARKESEL_API_KEY;
  const hasApiKey = !!apiKey;
  const apiKeyPreview = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET';
  
  console.log('🔑 API Key Status:', {
    exists: hasApiKey,
    length: apiKey?.length || 0,
    preview: apiKeyPreview,
  });
  
  console.log('🌐 Base URL: https://sms.arkesel.com');
  console.log('📍 Endpoint: /api/otp/generate');
  console.log('═══════════════════════════════════════════════════════');
  
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

/**
 * GET /api/v1/members
 * Get all members for the authenticated user's account
 */
memberRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Get user's account
    const account = await accountService.getUserAccount(userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const members = await memberService.getMembersByAccount(account.account_id);
    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch members';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/v1/members/stats
 * Get member statistics for the authenticated user's account
 */
memberRoutes.get('/stats', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Get user's account
    const account = await accountService.getUserAccount(userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const stats = await memberService.getMemberStats(account.account_id);
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch member stats';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/v1/members/:id
 * Get a specific member by ID
 */
memberRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const member = await memberService.getMember(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found',
      });
    }
    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch member';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/members/bulk
 * Bulk create members from spreadsheet upload
 */
memberRoutes.post('/bulk', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const account = await accountService.getUserAccount(userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const members = req.body.members;
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Members array is required',
      });
    }

    const result = await memberService.bulkCreateMembers(account.account_id, members);
    res.status(201).json({
      success: true,
      data: result,
      message: `Imported ${result.created.length} member(s)${result.failed.length ? `, ${result.failed.length} failed` : ''}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk import members';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/members/bulk-delete
 * Bulk delete members
 */
memberRoutes.post('/bulk-delete', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const account = await accountService.getUserAccount(userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const memberIds = req.body.member_ids;
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'member_ids array is required',
      });
    }

    const result = await memberService.bulkDeleteMembers(account.account_id, memberIds);
    res.status(200).json({
      success: true,
      data: result,
      message: `Deleted ${result.deleted.length} member(s)${result.failed.length ? `, ${result.failed.length} failed` : ''}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk delete members';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/members
 * Create a new member
 */
memberRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Get user's account
    const account = await accountService.getUserAccount(userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const input: CreateMemberInput = {
      account_id: account.account_id,
      full_name: req.body.full_name,
      dob: req.body.dob,
      phone: req.body.phone,
      phone_verified: req.body.phone_verified,
      email: req.body.email,
      email_verified: req.body.email_verified,
      membership_number: req.body.membership_number,
      isCollector: req.body.isCollector || false,
    };

    // Get base URL dynamically from request headers or environment
    // Priority: origin header > referer header > env variable
    const baseUrl = req.headers.origin || 
                    (req.headers.referer ? new URL(req.headers.referer).origin : null) ||
                    process.env.FRONTEND_URL;
    
    console.log(`[Create Member] Base URL: ${baseUrl} (origin: ${req.headers.origin}, referer: ${req.headers.referer})`);
    
    const member = await memberService.createMember(input, baseUrl);
    res.status(201).json({
      success: true,
      data: member,
      message: 'Member created successfully',
    });
  } catch (error) {
    console.error('[Create Member] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create member';
    const statusCode = message.includes('not found') || message.includes('Unauthorized') ? 404 : 
                       message.includes('already exists') ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * PUT /api/v1/members/:id
 * Update a member
 */
memberRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const input: UpdateMemberInput = {
      full_name: req.body.full_name,
      dob: req.body.dob,
      phone: req.body.phone,
      phone_verified: req.body.phone_verified,
      email: req.body.email,
      email_verified: req.body.email_verified,
      membership_number: req.body.membership_number,
    };

    const member = await memberService.updateMember(req.params.id, input);

    // Promote to collector after update when requested
    if (req.body.isCollector && member.email?.trim()) {
      if (!member.email_verified) {
        return res.status(400).json({
          success: false,
          error: 'Email must be verified before setting a member as a collector',
        });
      }

      const baseUrl =
        req.body.baseUrl ||
        req.headers.origin ||
        (req.headers.referer ? new URL(req.headers.referer).origin : null) ||
        process.env.FRONTEND_URL;

      try {
        await memberService.createCollectorAccount(member, member.account_id, baseUrl || undefined);
      } catch (error) {
        console.error('[Update Member] Failed to create collector account:', error);
        return res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create collector account',
          data: member,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: member,
      message: req.body.isCollector
        ? 'Member updated and promoted to collector successfully'
        : 'Member updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update member';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * DELETE /api/v1/members/:id
 * Delete a member
 */
memberRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    await memberService.deleteMember(req.params.id);
    res.status(200).json({
      success: true,
      data: null,
      message: 'Member deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete member';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/members/:id/verify-phone
 * Verify phone number
 */
memberRoutes.post('/:id/verify-phone', async (req: Request, res: Response) => {
  try {
    const member = await memberService.verifyPhone(req.params.id);
    res.status(200).json({
      success: true,
      data: member,
      message: 'Phone verified successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify phone';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/members/:id/verify-email
 * Verify email
 */
memberRoutes.post('/:id/verify-email', async (req: Request, res: Response) => {
  try {
    const member = await memberService.verifyEmail(req.params.id);
    res.status(200).json({
      success: true,
      data: member,
      message: 'Email verified successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify email';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/members/:id/send-verification-email
 * Send verification email to member
 */
memberRoutes.post('/:id/send-verification-email', async (req: Request, res: Response) => {
  try {
    // Get base URL dynamically from request headers or environment
    const baseUrl = req.body.baseUrl || 
                    req.headers.origin || 
                    (req.headers.referer ? new URL(req.headers.referer).origin : null) ||
                    process.env.FRONTEND_URL;
    await memberService.sendVerificationEmail(req.params.id, baseUrl);
    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send verification email';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/members/:id/resend-collector-invite
 * Resend collector welcome email with a fresh password-setup link
 */
memberRoutes.post('/:id/resend-collector-invite', async (req: Request, res: Response) => {
  try {
    const baseUrl =
      req.body.baseUrl ||
      req.headers.origin ||
      (req.headers.referer ? new URL(req.headers.referer).origin : null) ||
      process.env.FRONTEND_URL;

    await memberService.resendCollectorInvite(req.params.id, baseUrl || undefined);
    res.status(200).json({
      success: true,
      message: 'Collector invite resent successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resend collector invite';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});





/**
 * POST /api/v1/members/:id/send-phone-otp
 * Send OTP to member's phone number
 */
memberRoutes.post('/:id/send-phone-otp', async (req: Request, res: Response) => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📞 [CONTROLLER] POST /members/:id/send-phone-otp');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🆔 Member ID:', req.params.id);
  console.log('📋 Request Body:', JSON.stringify(req.body, null, 2));
  
  try {
    const member = await memberService.getMember(req.params.id);
    console.log('👤 Member Found:', member ? 'Yes' : 'No');
    
    if (!member) {
      console.error('❌ Member not found');
      return res.status(404).json({
        success: false,
        error: 'Member not found',
      });
    }

    console.log('📱 Member Phone:', member.phone);
    
    if (!member.phone) {
      console.error('❌ Member does not have a phone number');
      return res.status(400).json({
        success: false,
        error: 'Member does not have a phone number',
      });
    }

    console.log('🚀 Calling Arkesel service to send OTP...');
    
    // Send OTP via Arkesel (Arkesel generates and sends the OTP)
    const result = await arkeselService.sendOTP(
      member.phone,
      'Your Pollean verification code is %otp_code%. Valid for %expiry% minutes.',
      5,
      6
    );

    console.log('📊 Arkesel Service Result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      console.error('❌ Arkesel service returned error:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send OTP',
      });
    }

    console.log('✅ OTP sent successfully via Arkesel');
    console.log('═══════════════════════════════════════════════════════');

    // Note: Arkesel generates the OTP, we don't get it in response
    // Verification will be done via Arkesel's verify endpoint

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      ussd_code: result.ussdCode,
    });
  } catch (error) {
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ [CONTROLLER] Exception in send-phone-otp');
    console.error('═══════════════════════════════════════════════════════');
    console.error('🔴 Error:', error);
    if (error instanceof Error) {
      console.error('💬 Message:', error.message);
      console.error('📚 Stack:', error.stack);
    }
    console.error('═══════════════════════════════════════════════════════');
    
    const message = error instanceof Error ? error.message : 'Failed to send OTP';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/members/:id/verify-phone-otp
 * Verify OTP code and mark phone as verified
 */
memberRoutes.post('/:id/verify-phone-otp', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'OTP code is required',
      });
    }

    const member = await memberService.getMember(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found',
      });
    }

    if (!member.phone) {
      return res.status(400).json({
        success: false,
        error: 'Member does not have a phone number',
      });
    }

    // Verify OTP via Arkesel API
    const verifyResult = await arkeselService.verifyOTP(member.phone, code);

    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        error: verifyResult.error || 'Invalid or expired OTP code',
      });
    }

    // Mark phone as verified
    const updatedMember = await memberService.verifyPhone(req.params.id);

    res.status(200).json({
      success: true,
      data: updatedMember,
      message: 'Phone verified successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify OTP';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/members/:id/send-email-otp
 * Send OTP to member's email address (for verifying email on an existing member)
 */
memberRoutes.post('/:id/send-email-otp', async (req: Request, res: Response) => {
  try {
    const member = await memberService.getMember(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found',
      });
    }

    const requestedEmail =
      typeof req.body.email === 'string' && req.body.email.trim()
        ? req.body.email.trim()
        : member.email;

    if (!requestedEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requestedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    const normalizedEmail = requestedEmail.toLowerCase().trim();

    // Ensure another member in this account isn't already using this email
    const members = await memberService.getMembersByAccount(member.account_id);
    const emailTaken = members.some(
      (m) =>
        m.member_id !== member.member_id &&
        m.email &&
        m.email.toLowerCase().trim() === normalizedEmail
    );

    if (emailTaken) {
      return res.status(400).json({
        success: false,
        error: 'A member with this email address already exists',
      });
    }

    // Persist email on the member if it changed (still unverified until OTP succeeds)
    if (!member.email || member.email.toLowerCase().trim() !== normalizedEmail) {
      await memberService.updateMember(member.member_id, {
        email: normalizedEmail,
        email_verified: false,
      });
    }

    const otpCode = generateEmailOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    try {
      await otpRepository.create({
        account_id: member.account_id,
        identifier: normalizedEmail,
        identifier_type: 'email',
        otp_code: otpCode,
        expires_at: expiresAt,
        max_attempts: 3,
      });
    } catch (dbError) {
      console.error('[Send Email OTP] Failed to store OTP:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate OTP. Please try again.',
      });
    }

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
          <p>Hello${member.full_name ? ` ${member.full_name}` : ''},</p>
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
      normalizedEmail,
      emailSubject,
      emailBody,
      `Your Pollean verification code is ${otpCode}. This code will expire in 5 minutes.`,
      'email-otp'
    );

    if (!result.success) {
      console.error('[Send Email OTP] Failed to send email:', result.error);
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
    console.error('[Send Email OTP] Exception:', error);
    const message = error instanceof Error ? error.message : 'Failed to send OTP';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/members/:id/verify-email-otp
 * Verify OTP code and mark member email as verified
 */
memberRoutes.post('/:id/verify-email-otp', async (req: Request, res: Response) => {
  try {
    const { code, email } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        error: 'OTP code is required',
      });
    }

    const member = await memberService.getMember(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found',
      });
    }

    const targetEmail =
      typeof email === 'string' && email.trim()
        ? email.trim()
        : member.email;

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required',
      });
    }

    const normalizedEmail = targetEmail.toLowerCase().trim();
    const isValid = await otpRepository.verify(
      member.account_id,
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

    const updatedMember = await memberService.updateMember(member.member_id, {
      email: normalizedEmail,
      email_verified: true,
    });

    res.status(200).json({
      success: true,
      data: updatedMember,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('[Verify Email OTP] Exception:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify OTP';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

// NOTE: /otp/send and /otp/verify routes are defined in member.routes.ts
// (before auth middleware) to make them public. They are NOT defined here
// to avoid route conflicts.
