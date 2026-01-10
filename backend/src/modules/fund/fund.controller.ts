/**
 * Fund Controller
 * 
 * Handles Express req and res.
 * Calls service methods.
 * Converts thrown errors into HTTP responses.
 * No Supabase usage here.
 */

import { Router, Request, Response } from 'express';
import { fundService } from './fund.service.js';
import { CreateFundInput, UpdateFundInput } from './fund.entity.js';
import { AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { accountService } from '../account/account.service.js';

export const fundRoutes = Router();

/**
 * GET /api/v1/funds
 * Get all funds for the authenticated user's account
 */
fundRoutes.get('/', async (req: Request, res: Response) => {
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

    const funds = await fundService.getFundsByAccount(account.account_id);
    res.status(200).json({
      success: true,
      data: funds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch funds';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/v1/funds/active
 * Get active funds for the authenticated user's account
 */
fundRoutes.get('/active', async (req: Request, res: Response) => {
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

    const funds = await fundService.getActiveFundsByAccount(account.account_id);
    res.status(200).json({
      success: true,
      data: funds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch active funds';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/v1/funds/public/:accountId
 * Get public active funds for an account (for public pages, no auth required)
 */
fundRoutes.get('/public/:accountId', async (req: Request, res: Response) => {
  try {
    const accountId = req.params.accountId;
    const funds = await fundService.getPublicActiveFundsByAccount(accountId);
    res.status(200).json({
      success: true,
      data: funds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch public funds';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/v1/funds/stats
 * Get fund statistics for the authenticated user's account
 */
fundRoutes.get('/stats', async (req: Request, res: Response) => {
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

    const stats = await fundService.getFundStats(account.account_id);
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch fund stats';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/v1/funds/:id
 * Get a specific fund by ID (authenticated route - public route is in fund.routes.ts)
 * Note: Public access route is defined in fund.routes.ts before auth middleware
 */
fundRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const fund = await fundService.getFund(req.params.id);
    if (!fund) {
      return res.status(404).json({
        success: false,
        error: 'Fund not found',
      });
    }
    res.status(200).json({
      success: true,
      data: fund,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch fund';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/funds
 * Create a new fund
 */
fundRoutes.post('/', async (req: Request, res: Response) => {
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

    const input: CreateFundInput = {
      account_id: account.account_id,
      fund_name: req.body.fund_name,
      description: req.body.description,
      default_amount: req.body.default_amount,
      is_active: req.body.is_active,
      is_public: req.body.is_public,
    };

    const fund = await fundService.createFund(input);
    res.status(201).json({
      success: true,
      data: fund,
      message: 'Fund created successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create fund';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
});

/**
 * PUT /api/v1/funds/:id
 * Update a fund
 */
fundRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const input: UpdateFundInput = {
      fund_name: req.body.fund_name,
      description: req.body.description,
      default_amount: req.body.default_amount,
      is_active: req.body.is_active,
      is_public: req.body.is_public,
    };

    const fund = await fundService.updateFund(req.params.id, input);
    res.status(200).json({
      success: true,
      data: fund,
      message: 'Fund updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update fund';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * DELETE /api/v1/funds/:id
 * Delete a fund
 */
fundRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    await fundService.deleteFund(req.params.id);
    res.status(200).json({
      success: true,
      data: null,
      message: 'Fund deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete fund';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/funds/:id/activate
 * Activate a fund
 */
fundRoutes.post('/:id/activate', async (req: Request, res: Response) => {
  try {
    const fund = await fundService.activateFund(req.params.id);
    res.status(200).json({
      success: true,
      data: fund,
      message: 'Fund activated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to activate fund';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/funds/:id/deactivate
 * Deactivate a fund
 */
fundRoutes.post('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const fund = await fundService.deactivateFund(req.params.id);
    res.status(200).json({
      success: true,
      data: fund,
      message: 'Fund deactivated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate fund';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

