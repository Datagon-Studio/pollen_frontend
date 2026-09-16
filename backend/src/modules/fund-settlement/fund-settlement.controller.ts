/**
 * Fund Settlement Controller
 *
 * Handles Express req and res.
 * Calls service methods.
 * Converts thrown errors into HTTP responses.
 * No Supabase usage here.
 */

import { Router, Request, Response } from 'express';
import { fundSettlementService } from './fund-settlement.service.js';
import { CreateFundSettlementInput, UpdateFundSettlementInput } from './fund-settlement.entity.js';
import { AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { accountService } from '../account/account.service.js';

export const fundSettlementRoutes = Router();

async function requireUserAccount(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
    return null;
  }

  const account = await accountService.getUserAccount(userId);
  if (!account) {
    res.status(404).json({
      success: false,
      error: 'Account not found',
    });
    return null;
  }

  return { userId, account };
}

/**
 * GET /api/v1/fund-settlements
 */
fundSettlementRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const ctx = await requireUserAccount(req, res);
    if (!ctx) return;

    const settlements = await fundSettlementService.getSettlementsByAccount(ctx.account.account_id);
    res.status(200).json({
      success: true,
      data: settlements,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch settlements';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/v1/fund-settlements/stats
 */
fundSettlementRoutes.get('/stats', async (req: Request, res: Response) => {
  try {
    const ctx = await requireUserAccount(req, res);
    if (!ctx) return;

    const stats = await fundSettlementService.getStats(ctx.account.account_id);
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch settlement stats';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/v1/fund-settlements/fund/:fundId
 */
fundSettlementRoutes.get('/fund/:fundId', async (req: Request, res: Response) => {
  try {
    const ctx = await requireUserAccount(req, res);
    if (!ctx) return;

    const settlements = await fundSettlementService.getSettlementsByFund(
      ctx.account.account_id,
      req.params.fundId
    );
    res.status(200).json({
      success: true,
      data: settlements,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch fund settlements';
    const statusCode = message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/v1/fund-settlements/:id
 */
fundSettlementRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const ctx = await requireUserAccount(req, res);
    if (!ctx) return;

    const settlement = await fundSettlementService.getSettlement(req.params.id);
    if (!settlement || settlement.account_id !== ctx.account.account_id) {
      return res.status(404).json({
        success: false,
        error: 'Settlement not found',
      });
    }
    res.status(200).json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch settlement';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/fund-settlements
 */
fundSettlementRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const ctx = await requireUserAccount(req, res);
    if (!ctx) return;

    const input: CreateFundSettlementInput = {
      account_id: ctx.account.account_id,
      fund_id: req.body.fund_id,
      recorded_by_user_id: ctx.userId,
      amount: req.body.amount,
      settlement_date: req.body.settlement_date,
      status: req.body.status,
      reference: req.body.reference,
      notes: req.body.notes,
    };

    const settlement = await fundSettlementService.createSettlement(input);
    res.status(201).json({
      success: true,
      data: settlement,
      message: 'Settlement recorded successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record settlement';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
});

/**
 * PUT /api/v1/fund-settlements/:id
 */
fundSettlementRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const ctx = await requireUserAccount(req, res);
    if (!ctx) return;

    const input: UpdateFundSettlementInput = {
      fund_id: req.body.fund_id,
      amount: req.body.amount,
      settlement_date: req.body.settlement_date,
      reference: req.body.reference,
      notes: req.body.notes,
    };

    const settlement = await fundSettlementService.updateSettlement(
      req.params.id,
      ctx.account.account_id,
      input
    );
    res.status(200).json({
      success: true,
      data: settlement,
      message: 'Settlement updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update settlement';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/fund-settlements/:id/mark-successful
 */
fundSettlementRoutes.post('/:id/mark-successful', async (req: Request, res: Response) => {
  try {
    const ctx = await requireUserAccount(req, res);
    if (!ctx) return;

    const settlement = await fundSettlementService.markSuccessful(
      req.params.id,
      ctx.account.account_id
    );
    res.status(200).json({
      success: true,
      data: settlement,
      message: 'Settlement marked as successful',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark settlement as successful';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/fund-settlements/:id/cancel
 */
fundSettlementRoutes.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const ctx = await requireUserAccount(req, res);
    if (!ctx) return;

    const settlement = await fundSettlementService.cancelSettlement(
      req.params.id,
      ctx.account.account_id
    );
    res.status(200).json({
      success: true,
      data: settlement,
      message: 'Settlement canceled',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel settlement';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/fund-settlements/:id/archive
 */
fundSettlementRoutes.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const ctx = await requireUserAccount(req, res);
    if (!ctx) return;

    const settlement = await fundSettlementService.archiveSettlement(
      req.params.id,
      ctx.account.account_id,
      ctx.userId
    );
    res.status(200).json({
      success: true,
      data: settlement,
      message: 'Settlement archived',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to archive settlement';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/fund-settlements/:id/unarchive
 */
fundSettlementRoutes.post('/:id/unarchive', async (req: Request, res: Response) => {
  try {
    const ctx = await requireUserAccount(req, res);
    if (!ctx) return;

    const settlement = await fundSettlementService.unarchiveSettlement(
      req.params.id,
      ctx.account.account_id
    );
    res.status(200).json({
      success: true,
      data: settlement,
      message: 'Settlement restored',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to restore settlement';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});
