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
import { accountKYCService } from './account-kyc.service.js';
import { CreateAccountKYCInput, UpdateAccountKYCInput } from './account-kyc.entity.js';
import { AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { userService } from '../user/user.service.js';

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

      // Only allow updating account_name and account_logo
      const input: UpdateAccountInput = {
        account_name: req.body.account_name,
        account_logo: req.body.account_logo,
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

  /**
   * GET /api/v1/accounts/me/kyc
   * Get current user's account KYC information
   */
  async getMyAccountKYC(req: Request, res: Response): Promise<void> {
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

      const userAccount = await accountService.getUserAccount(userId);
      if (!userAccount) {
        res.status(404).json({
          success: false,
          error: 'Account not found',
        });
        return;
      }

      const kyc = await accountKYCService.getKYCByAccountId(userAccount.account_id);

      res.status(200).json({
        success: true,
        data: kyc,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch KYC';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/v1/accounts/me/kyc
   * Submit or update KYC information
   */
  async submitKYC(req: Request, res: Response): Promise<void> {
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

      const userAccount = await accountService.getUserAccount(userId);
      if (!userAccount) {
        res.status(404).json({
          success: false,
          error: 'Account not found',
        });
        return;
      }

      const input: CreateAccountKYCInput = {
        account_id: userAccount.account_id,
        account_type: req.body.account_type,
        official_name: req.body.official_name,
        business_registration_url: req.body.business_registration_url ?? null,
        passport_photo_url: req.body.passport_photo_url ?? null,
        national_id_url: req.body.national_id_url,
      };

      const kyc = await accountKYCService.submitKYC(input);

      res.status(200).json({
        success: true,
        data: kyc,
        message: 'KYC information submitted successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit KYC';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * PUT /api/v1/accounts/me/kyc
   * Update KYC information
   */
  async updateKYC(req: Request, res: Response): Promise<void> {
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

      const userAccount = await accountService.getUserAccount(userId);
      if (!userAccount) {
        res.status(404).json({
          success: false,
          error: 'Account not found',
        });
        return;
      }

      const input: UpdateAccountKYCInput = {
        account_type: req.body.account_type,
        official_name: req.body.official_name,
        business_registration_url: req.body.business_registration_url ?? null,
        passport_photo_url: req.body.passport_photo_url ?? null,
        national_id_url: req.body.national_id_url,
      };

      const kyc = await accountKYCService.updateKYC(userAccount.account_id, input);

      res.status(200).json({
        success: true,
        data: kyc,
        message: 'KYC information updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update KYC';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/v1/accounts/kyc/all
   * Get all KYC submissions (superadmin only)
   */
  async getAllKYC(req: Request, res: Response): Promise<void> {
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

      // Check if user is superadmin
      const userProfile = await userService.getUserProfile(userId);
      if (!userProfile || userProfile.role !== 'superadmin') {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Superadmin access required',
        });
        return;
      }

      const kycList = await accountKYCService.getAllKYC();

      // Enrich with account information
      const enrichedKYC = await Promise.all(
        kycList.map(async (kyc) => {
          const account = await accountService.getAccountById(kyc.account_id);
          return {
            ...kyc,
            account_name: account?.account_name || null,
            account_kyc_status: account?.kyc_status || null,
          };
        })
      );

      res.status(200).json({
        success: true,
        data: enrichedKYC,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch KYC list';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/v1/accounts/:accountId/kyc/verify
   * Verify a KYC submission (admin only)
   */
  async verifyKYC(req: Request, res: Response): Promise<void> {
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

      // TODO: Add admin role check here later
      // For now, allow all authenticated users

      const { accountId } = req.params;

      const kyc = await accountKYCService.verifyKYC(accountId, userId);

      res.status(200).json({
        success: true,
        data: kyc,
        message: 'KYC verified successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to verify KYC';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/v1/accounts/kyc/document-url
   * Generate a signed URL for a KYC document (superadmin only)
   */
  async getKYCDocumentUrl(req: Request, res: Response): Promise<void> {
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

      const userProfile = await userService.getUserProfile(userId);
      if (!userProfile || userProfile.role !== 'superadmin') {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Superadmin access required',
        });
        return;
      }

      const filePath = req.query.path;
      if (typeof filePath !== 'string' || !filePath.trim()) {
        res.status(400).json({
          success: false,
          error: 'Document path is required',
        });
        return;
      }

      const signedUrl = await accountKYCService.getDocumentSignedUrl(filePath.trim());

      res.status(200).json({
        success: true,
        data: { signedUrl },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate document URL';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/v1/accounts/:accountId/kyc/reject
   * Reject a KYC submission (superadmin only)
   */
  async rejectKYC(req: Request, res: Response): Promise<void> {
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

      // Check if user is superadmin
      const userProfile = await userService.getUserProfile(userId);
      if (!userProfile || userProfile.role !== 'superadmin') {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Superadmin access required',
        });
        return;
      }

      const { accountId } = req.params;

      await accountKYCService.rejectKYC(accountId, userId);

      res.status(200).json({
        success: true,
        message: 'KYC rejected successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject KYC';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }
}

export const accountController = new AccountController();
