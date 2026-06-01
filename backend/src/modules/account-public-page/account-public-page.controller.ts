/**
 * Account Public Page Controller
 * 
 * Handles Express req and res.
 * Calls service methods.
 * Converts thrown errors into HTTP responses.
 */

import { Request, Response } from 'express';
import { accountPublicPageService } from './account-public-page.service.js';
import { UpdateAccountPublicPageInput } from './account-public-page.entity.js';
import { AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { accountService } from '../account/account.service.js';

export class AccountPublicPageController {
  /**
   * GET /api/v1/account-public-pages/public/:accountId
   * Get public page for an account (no auth required)
   */
  async getPublicPage(req: Request, res: Response): Promise<void> {
    try {
      const accountId = req.params.accountId;
      if (!accountId) {
        res.status(400).json({
          success: false,
          error: 'Account ID is required',
        });
        return;
      }

      const publicPage = await accountPublicPageService.getPublicPageByAccountIdPublic(accountId);

      res.status(200).json({
        success: true,
        data: publicPage,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch public page';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/v1/account-public-pages/me
   * Get current user's account public page
   */
  async getMyPublicPage(req: Request, res: Response): Promise<void> {
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

      const publicPage = await accountPublicPageService.getPublicPageByAccountId(userId, account.account_id);

      res.status(200).json({
        success: true,
        data: publicPage,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch public page';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * PUT /api/v1/account-public-pages/me
   * Update current user's account public page
   */
  async updateMyPublicPage(req: Request, res: Response): Promise<void> {
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

      const input: UpdateAccountPublicPageInput = {
        url_slug: req.body.url_slug,
        display_name: req.body.display_name,
        logo_url: req.body.logo_url,
        primary_color: req.body.primary_color,
        secondary_color: req.body.secondary_color,
        is_published: req.body.is_published,
        use_custom_theme: req.body.use_custom_theme,
        custom_primary_color: req.body.custom_primary_color,
        custom_secondary_light_color: req.body.custom_secondary_light_color,
        custom_background_light_color: req.body.custom_background_light_color,
        custom_text_color: req.body.custom_text_color,
        custom_secondary_dark_color: req.body.custom_secondary_dark_color,
        custom_background_dark_color: req.body.custom_background_dark_color,
        custom_text_color_dark: req.body.custom_text_color_dark,
      };

      const publicPage = await accountPublicPageService.updatePublicPage(userId, account.account_id, input);

      res.status(200).json({
        success: true,
        data: publicPage,
        message: 'Public page updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update public page';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }
}

export const accountPublicPageController = new AccountPublicPageController();
