import { Router, Request, Response } from 'express';
import { accountService } from './account.service.js';
import { sendSuccess, sendError, sendCreated, sendNotFound, sendBadRequest } from '../../shared/utils/api-response.js';

export const accountRoutes = Router();

// GET /api/v1/accounts
accountRoutes.get('/', async (_req: Request, res: Response) => {
  try {
    const accounts = await accountService.getAllAccounts();
    sendSuccess(res, accounts);
  } catch (error) {
    sendError(res, 'Failed to fetch accounts');
  }
});

// GET /api/v1/accounts/:id
accountRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const account = await accountService.getAccount(req.params.id);
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    sendSuccess(res, account);
  } catch (error) {
    sendError(res, 'Failed to fetch account');
  }
});

// GET /api/v1/accounts/slug/:slug
accountRoutes.get('/slug/:slug', async (req: Request, res: Response) => {
  try {
    const account = await accountService.getAccountBySlug(req.params.slug);
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    sendSuccess(res, account);
  } catch (error) {
    sendError(res, 'Failed to fetch account');
  }
});

// POST /api/v1/accounts
accountRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const account = await accountService.createAccount(req.body);
    if (!account) {
      return sendBadRequest(res, 'Failed to create account');
    }
    sendCreated(res, account, 'Account created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create account';
    sendBadRequest(res, message);
  }
});

// PUT /api/v1/accounts/:id
accountRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const account = await accountService.updateAccount(req.params.id, req.body);
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    sendSuccess(res, account, 'Account updated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update account';
    sendError(res, message);
  }
});

// DELETE /api/v1/accounts/:id
accountRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await accountService.deleteAccount(req.params.id);
    if (!deleted) {
      return sendNotFound(res, 'Account not found');
    }
    sendSuccess(res, null, 'Account deleted successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete account';
    sendError(res, message);
  }
});

// PUT /api/v1/accounts/:id/public-page
accountRoutes.put('/:id/public-page', async (req: Request, res: Response) => {
  try {
    const account = await accountService.updatePublicPageSettings(req.params.id, req.body);
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    sendSuccess(res, account, 'Public page settings updated');
  } catch (error) {
    sendError(res, 'Failed to update public page settings');
  }
});

// PUT /api/v1/accounts/:id/settlement
accountRoutes.put('/:id/settlement', async (req: Request, res: Response) => {
  try {
    const account = await accountService.updateSettlementDetails(req.params.id, req.body);
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    sendSuccess(res, account, 'Settlement details updated');
  } catch (error) {
    sendError(res, 'Failed to update settlement details');
  }
});

// PUT /api/v1/accounts/:id/notifications
accountRoutes.put('/:id/notifications', async (req: Request, res: Response) => {
  try {
    const account = await accountService.updateNotificationSettings(req.params.id, req.body);
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    sendSuccess(res, account, 'Notification settings updated');
  } catch (error) {
    sendError(res, 'Failed to update notification settings');
  }
});

// PUT /api/v1/accounts/:id/transparency
accountRoutes.put('/:id/transparency', async (req: Request, res: Response) => {
  try {
    const account = await accountService.updateExpenseTransparency(req.params.id, req.body);
    if (!account) {
      return sendNotFound(res, 'Account not found');
    }
    sendSuccess(res, account, 'Expense transparency settings updated');
  } catch (error) {
    sendError(res, 'Failed to update expense transparency settings');
  }
});

