import { Router, Request, Response } from 'express';
import { sendSuccess, sendError, sendBadRequest } from '../../shared/utils/api-response.js';
import { authenticateToken, AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { accountService } from '../account/account.service.js';
import { auditRepository } from './audit.repository.js';

export const auditRoutes = Router();

auditRoutes.use(authenticateToken);

// GET /api/v1/audit-logs?accountId=xxx&limit=50&category=PAYMENT
auditRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    const accountId = req.query.accountId as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const category = req.query.category as string | undefined;

    if (!accountId) {
      return sendBadRequest(res, 'Account ID is required');
    }

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const userAccount = await accountService.getUserAccount(userId);
    if (!userAccount || userAccount.account_id !== accountId) {
      return sendError(res, 'Access denied', 403);
    }

    const logs = await auditRepository.findByAccountId(accountId, {
      limit: Math.min(limit, 100),
      category,
    });

    sendSuccess(res, logs);
  } catch (error) {
    sendError(res, 'Failed to fetch audit logs');
  }
});
