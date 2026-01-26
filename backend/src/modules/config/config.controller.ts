/**
 * Config Controller
 * 
 * Handles Express req and res.
 * Calls service methods.
 * Converts thrown errors into HTTP responses.
 */

import { Request, Response } from 'express';
import { configService } from './config.service.js';
import { UpdateConfigInput } from './config.entity.js';
import { AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { accountService } from '../account/account.service.js';
import { userRepository } from '../user/user.repository.js';
import { supabase } from '../../shared/supabase/client.js';

export class ConfigController {
  /**
   * GET /api/v1/config/public/:accountId
   * Get public config for an account (no auth required, only returns expense_visibility_level)
   */
  async getPublicConfig(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.params.accountId;
      if (!accountId) {
        res.status(400).json({
          success: false,
          error: 'Account ID is required',
        });
        return;
      }

      const config = await configService.getConfigByAccountId(accountId);

      if (!config) {
        // Return default if config doesn't exist
        res.status(200).json({
          success: true,
          data: {
            expense_visibility_level: 'summary',
          },
        });
        return;
      }

      // Only return expense_visibility_level for public access
      res.status(200).json({
        success: true,
        data: {
          expense_visibility_level: config.expense_visibility_level,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch config';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/v1/config/me
   * Get current user's account config
   */
  async getMyConfig(req: Request, res: Response): Promise<void> {
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

      const config = await configService.getConfigByAccountId(account.account_id);

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'Config not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch config';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * PUT /api/v1/config/me
   * Update current user's account config
   */
  async updateMyConfig(req: Request, res: Response): Promise<void> {
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

      // Check if user is admin for this account
      const { data: userAccountLink } = await supabase
        .from('user_accounts')
        .select('role')
        .eq('user_id', userId)
        .eq('account_id', account.account_id)
        .single();

      const isAdmin = userAccountLink?.role === 'admin';
      
      // Check if user is superadmin (platform-level admin)
      const userProfile = await userRepository.findByUserId(userId);
      const isSuperAdmin = userProfile?.role === 'admin'; // TODO: Add proper superadmin role check

      // Build input, filtering out admin-only fields if user is not admin
      const input: UpdateConfigInput = {
        payment_integration_id: req.body.payment_integration_id,
        birthday_messages_enabled: req.body.birthday_messages_enabled,
        default_notification_channel: req.body.default_notification_channel,
        expense_visibility_level: req.body.expense_visibility_level,
      };

      // Only allow admins to update admin-only fields
      if (isAdmin) {
        input.smtp_profile_id = req.body.smtp_profile_id;
        input.sms_template = req.body.sms_template;
        input.email_template = req.body.email_template;
        // member_portal_enabled is always true, cannot be changed
      }

      // Only allow superadmins to update default_email_sender_id
      if (isSuperAdmin) {
        input.default_email_sender_id = req.body.default_email_sender_id;
      }

      const config = await configService.updateConfig(account.account_id, input);

      res.status(200).json({
        success: true,
        data: config,
        message: 'Config updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update config';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }
}

export const configController = new ConfigController();
