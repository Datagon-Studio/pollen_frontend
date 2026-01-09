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

export const memberRoutes = Router();

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
