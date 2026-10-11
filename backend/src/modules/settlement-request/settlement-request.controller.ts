import { Router, Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { sendError, sendSuccess, sendUnauthorized } from '../../shared/utils/api-response.js';
import {
  SettlementRequestError,
  settlementRequestService,
} from './settlement-request.service.js';

export const settlementRequestRoutes = Router();

settlementRequestRoutes.use(authenticateToken);

function handleError(error: unknown, res: Response) {
  if (error instanceof SettlementRequestError) {
    return sendError(res, error.message, error.statusCode);
  }
  const message = error instanceof Error ? error.message : 'Settlement request failed';
  return sendError(res, message);
}

/** GET /api/v1/settlement-requests — requests for accounts this user manages */
settlementRequestRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) return sendUnauthorized(res);
    const data = await settlementRequestService.listForManager(userId);
    return sendSuccess(res, data);
  } catch (error) {
    return handleError(error, res);
  }
});

/** GET /api/v1/settlement-requests/context/:accountId — active payout destination */
settlementRequestRoutes.get('/context/:accountId', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) return sendUnauthorized(res);
    const data = await settlementRequestService.getContext(userId, req.params.accountId);
    return sendSuccess(res, data);
  } catch (error) {
    return handleError(error, res);
  }
});

/** POST /api/v1/settlement-requests — group manager creates a request */
settlementRequestRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) return sendUnauthorized(res);
    const { account_id, fund_id, amount, request_note } = req.body ?? {};
    const data = await settlementRequestService.create(userId, {
      account_id,
      fund_id,
      amount,
      request_note,
    });
    return sendSuccess(res, data, 'Settlement request submitted', 201);
  } catch (error) {
    return handleError(error, res);
  }
});
