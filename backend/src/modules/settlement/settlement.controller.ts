/**
 * Settlement Details Controller
 * 
 * Handles Express req and res for Settlement Details.
 */

import { Router, Request, Response } from 'express';
import { settlementService } from './settlement.service.js';
import { CreateSettlementDetailsInput, UpdateSettlementDetailsInput } from './settlement.entity.js';
import { authenticateToken, AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { accountService } from '../account/account.service.js';
import { sendSuccess, sendError, sendBadRequest, sendNotFound } from '../../shared/utils/api-response.js';

export const settlementRoutes = Router();

// All routes require authentication
settlementRoutes.use(authenticateToken);

// GET /api/v1/settlements/me - Get current user's account settlement details
settlementRoutes.get('/me', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const userAccount = await accountService.getUserAccount(userId);
    if (!userAccount) {
      return sendError(res, 'Account not found', 404);
    }

    const settlements = await settlementService.getSettlementDetailsByAccountId(userAccount.account_id);
    sendSuccess(res, settlements);
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to fetch settlement details');
  }
});

// POST /api/v1/settlements/me - Create or update settlement details
settlementRoutes.post('/me', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const userAccount = await accountService.getUserAccount(userId);
    if (!userAccount) {
      return sendError(res, 'Account not found', 404);
    }

    const { settlement_type, account_name, account_number, provider, is_active } = req.body;

    if (!settlement_type || !['bank', 'mobile_money'].includes(settlement_type)) {
      return sendBadRequest(res, 'Valid settlement_type (bank or mobile_money) is required');
    }

    if (!account_name || typeof account_name !== 'string' || !account_name.trim()) {
      return sendBadRequest(res, 'Account name is required');
    }

    if (!account_number || typeof account_number !== 'string' || !account_number.trim()) {
      return sendBadRequest(res, 'Account number is required');
    }

    if (settlement_type === 'mobile_money' && (!provider || typeof provider !== 'string' || !provider.trim())) {
      return sendBadRequest(res, 'Provider is required for mobile money settlement type');
    }

    const input: CreateSettlementDetailsInput = {
      account_id: userAccount.account_id,
      settlement_type,
      account_name: account_name.trim(),
      account_number: account_number.trim(),
      provider: provider?.trim() || null,
      is_active: is_active !== undefined ? is_active : true,
    };

    const settlement = await settlementService.upsertSettlementDetails(input);
    sendSuccess(res, settlement, 'Settlement details saved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to save settlement details');
  }
});

// PUT /api/v1/settlements/:id - Update settlement details
settlementRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const { id } = req.params;
    const existing = await settlementService.getSettlementDetailsByAccountId(
      (await accountService.getUserAccount(userId!))!.account_id
    );
    const settlement = existing.find(s => s.settlement_id === id);

    if (!settlement) {
      return sendNotFound(res, 'Settlement details not found');
    }

    const input: UpdateSettlementDetailsInput = {
      settlement_type: req.body.settlement_type,
      account_name: req.body.account_name,
      account_number: req.body.account_number,
      provider: req.body.provider,
      is_active: req.body.is_active,
    };

    const updated = await settlementService.updateSettlementDetails(id, input);
    sendSuccess(res, updated, 'Settlement details updated successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to update settlement details');
  }
});

// DELETE /api/v1/settlements/:id - Delete settlement details
settlementRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const { id } = req.params;
    await settlementService.deleteSettlementDetails(id);
    sendSuccess(res, null, 'Settlement details deleted successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to delete settlement details');
  }
});
