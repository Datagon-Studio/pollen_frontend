/**
 * Member Routes
 * 
 * Defines routes for the member module.
 */

import { Router, Request, Response } from 'express';
import { memberRoutes } from './member.controller.js';
import { authenticateToken } from '../../shared/middleware/auth.middleware.js';
import { arkeselService } from '../../shared/services/arkesel.service.js';
import { memberService } from './member.service.js';

export const memberRoutesWithAuth = Router();

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
    const normalizedPhone = phone.replace(/[\s\-+]/g, '');
    const member = members.find(m => {
      const memberPhone = m.phone.replace(/[\s\-+]/g, '');
      return memberPhone === normalizedPhone;
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found with this phone number',
      });
    }

    const result = await arkeselService.sendOTP(
      phone,
      'Your PollenHive verification code is %otp_code%. Valid for %expiry% minutes.',
      5,
      6
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP. Please try again later.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send OTP',
    });
  }
});

// POST /api/v1/members/otp/verify - Verify OTP (public)
memberRoutesWithAuth.post('/otp/verify', async (req: Request, res: Response) => {
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
    const normalizedPhone = phone.replace(/[\s\-+]/g, '');
    const member = members.find(m => {
      const memberPhone = m.phone.replace(/[\s\-+]/g, '');
      return memberPhone === normalizedPhone;
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        member_id: member.member_id,
        full_name: member.full_name,
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
      'Your PollenHive verification code is %otp_code%. Valid for %expiry% minutes.',
      5,
      6
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP. Please try again later.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send OTP',
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
const authenticatedMemberRoutes = Router();
authenticatedMemberRoutes.use(authenticateToken);
authenticatedMemberRoutes.use('/', memberRoutes);

// Mount authenticated routes
memberRoutesWithAuth.use('/', authenticatedMemberRoutes);


