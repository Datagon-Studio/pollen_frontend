/**
 * Account Controller
 * 
 * Handles Express req and res.
 * Calls service methods.
 * Converts thrown errors into HTTP responses.
 * No Supabase usage here.
 */

import { Request, Response } from 'express';
import { accountService } from './account.service.js';
import { UpdateAccountInput } from './account.entity.js';
import { AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';

export class AccountController {
  /**
   * GET /api/v1/accounts/me
   * Get current user's account
   */
  async getMyAccount(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const account = await accountService.getUserAccount(userId);

      if (!account) {
        res.status(404).json({
          success: false,
          error: 'Account not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: account,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch account';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * PUT /api/v1/accounts/me
   * Update current user's account (only account_name and account_logo)
   */
  async updateMyAccount(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // Get user's account first
      const userAccount = await accountService.getUserAccount(userId);
      if (!userAccount) {
        res.status(404).json({
          success: false,
          error: 'Account not found',
        });
        return;
      }

      // Only allow updating account_name, account_logo, foreground_color, and background_color
      const input: UpdateAccountInput = {
        account_name: req.body.account_name,
        account_logo: req.body.account_logo,
        foreground_color: req.body.foreground_color,
        background_color: req.body.background_color,
      };

      const account = await accountService.updateAccount(userId, userAccount.account_id, input);

      res.status(200).json({
        success: true,
        data: account,
        message: 'Account updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update account';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/v1/accounts/public/:accountId
   * Get public account info by account ID (no auth required)
   */
  async getPublicAccount(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.params.accountId;
      if (!accountId) {
        res.status(400).json({
          success: false,
          error: 'Account ID is required',
        });
        return;
      }

      const account = await accountService.getAccountById(accountId);
      if (!account) {
        res.status(404).json({
          success: false,
          error: 'Account not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: account,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch account';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
}

export const accountController = new AccountController();
