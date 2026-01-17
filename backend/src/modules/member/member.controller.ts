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

export const memberRoutes = Router();

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
    };

    const member = await memberService.createMember(input);
    res.status(201).json({
      success: true,
      data: member,
      message: 'Member created successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create member';
    res.status(400).json({
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
    res.status(200).json({
      success: true,
      data: member,
      message: 'Member updated successfully',
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
      'Your PollenHive verification code is %otp_code%. Valid for %expiry% minutes.',
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

// NOTE: /otp/send and /otp/verify routes are defined in member.routes.ts
// (before auth middleware) to make them public. They are NOT defined here
// to avoid route conflicts.
