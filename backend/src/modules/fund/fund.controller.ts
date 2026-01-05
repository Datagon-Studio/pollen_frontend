import { Router, Request, Response } from 'express';
import { fundService } from './fund.service.js';
import { sendSuccess, sendError, sendCreated, sendNotFound, sendBadRequest } from '../../shared/utils/api-response.js';

export const fundRoutes = Router();

// GET /api/v1/funds?accountId=xxx
fundRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    if (!accountId) {
      return sendBadRequest(res, 'Account ID is required');
    }
    const funds = await fundService.getFundsByAccount(accountId);
    sendSuccess(res, funds);
  } catch (error) {
    sendError(res, 'Failed to fetch funds');
  }
});

// GET /api/v1/funds/active?accountId=xxx
fundRoutes.get('/active', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    if (!accountId) {
      return sendBadRequest(res, 'Account ID is required');
    }
    const funds = await fundService.getActiveFundsByAccount(accountId);
    sendSuccess(res, funds);
  } catch (error) {
    sendError(res, 'Failed to fetch active funds');
  }
});

// GET /api/v1/funds/stats/:accountId
fundRoutes.get('/stats/:accountId', async (req: Request, res: Response) => {
  try {
    const stats = await fundService.getFundStats(req.params.accountId);
    sendSuccess(res, stats);
  } catch (error) {
    sendError(res, 'Failed to fetch fund stats');
  }
});

// GET /api/v1/funds/:id
fundRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const fund = await fundService.getFund(req.params.id);
    if (!fund) {
      return sendNotFound(res, 'Fund not found');
    }
    sendSuccess(res, fund);
  } catch (error) {
    sendError(res, 'Failed to fetch fund');
  }
});

// POST /api/v1/funds
fundRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const fund = await fundService.createFund(req.body);
    if (!fund) {
      return sendBadRequest(res, 'Failed to create fund');
    }
    sendCreated(res, fund, 'Fund created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create fund';
    sendBadRequest(res, message);
  }
});

// PUT /api/v1/funds/:id
fundRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const fund = await fundService.updateFund(req.params.id, req.body);
    if (!fund) {
      return sendNotFound(res, 'Fund not found');
    }
    sendSuccess(res, fund, 'Fund updated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update fund';
    sendError(res, message);
  }
});

// DELETE /api/v1/funds/:id
fundRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await fundService.deleteFund(req.params.id);
    if (!deleted) {
      return sendNotFound(res, 'Fund not found');
    }
    sendSuccess(res, null, 'Fund deleted successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete fund';
    sendError(res, message);
  }
});

// POST /api/v1/funds/:id/activate
fundRoutes.post('/:id/activate', async (req: Request, res: Response) => {
  try {
    const fund = await fundService.activateFund(req.params.id);
    if (!fund) {
      return sendNotFound(res, 'Fund not found');
    }
    sendSuccess(res, fund, 'Fund activated successfully');
  } catch (error) {
    sendError(res, 'Failed to activate fund');
  }
});

// POST /api/v1/funds/:id/deactivate
fundRoutes.post('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const fund = await fundService.deactivateFund(req.params.id);
    if (!fund) {
      return sendNotFound(res, 'Fund not found');
    }
    sendSuccess(res, fund, 'Fund deactivated successfully');
  } catch (error) {
    sendError(res, 'Failed to deactivate fund');
  }
});

