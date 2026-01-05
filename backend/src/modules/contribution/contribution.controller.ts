import { Router, Request, Response } from 'express';
import { contributionService } from './contribution.service.js';
import { sendSuccess, sendError, sendCreated, sendNotFound, sendBadRequest } from '../../shared/utils/api-response.js';

export const contributionRoutes = Router();

// GET /api/v1/contributions?accountId=xxx
contributionRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    if (!accountId) {
      return sendBadRequest(res, 'Account ID is required');
    }
    const contributions = await contributionService.getContributionsByAccount(accountId);
    sendSuccess(res, contributions);
  } catch (error) {
    sendError(res, 'Failed to fetch contributions');
  }
});

// GET /api/v1/contributions/pending?accountId=xxx
contributionRoutes.get('/pending', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    if (!accountId) {
      return sendBadRequest(res, 'Account ID is required');
    }
    const contributions = await contributionService.getPendingContributions(accountId);
    sendSuccess(res, contributions);
  } catch (error) {
    sendError(res, 'Failed to fetch pending contributions');
  }
});

// GET /api/v1/contributions/stats/:accountId
contributionRoutes.get('/stats/:accountId', async (req: Request, res: Response) => {
  try {
    const stats = await contributionService.getContributionStats(req.params.accountId);
    sendSuccess(res, stats);
  } catch (error) {
    sendError(res, 'Failed to fetch contribution stats');
  }
});

// GET /api/v1/contributions/fund/:fundId/stats
contributionRoutes.get('/fund/:fundId/stats', async (req: Request, res: Response) => {
  try {
    const stats = await contributionService.getFundContributionStats(req.params.fundId);
    sendSuccess(res, stats);
  } catch (error) {
    sendError(res, 'Failed to fetch fund contribution stats');
  }
});

// GET /api/v1/contributions/member/:memberId
contributionRoutes.get('/member/:memberId', async (req: Request, res: Response) => {
  try {
    const contributions = await contributionService.getContributionsByMember(req.params.memberId);
    sendSuccess(res, contributions);
  } catch (error) {
    sendError(res, 'Failed to fetch member contributions');
  }
});

// GET /api/v1/contributions/fund/:fundId
contributionRoutes.get('/fund/:fundId', async (req: Request, res: Response) => {
  try {
    const contributions = await contributionService.getContributionsByFund(req.params.fundId);
    sendSuccess(res, contributions);
  } catch (error) {
    sendError(res, 'Failed to fetch fund contributions');
  }
});

// GET /api/v1/contributions/:id
contributionRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const contribution = await contributionService.getContribution(req.params.id);
    if (!contribution) {
      return sendNotFound(res, 'Contribution not found');
    }
    sendSuccess(res, contribution);
  } catch (error) {
    sendError(res, 'Failed to fetch contribution');
  }
});

// POST /api/v1/contributions
contributionRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const contribution = await contributionService.createContribution(req.body);
    if (!contribution) {
      return sendBadRequest(res, 'Failed to create contribution');
    }
    sendCreated(res, contribution, 'Contribution recorded successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create contribution';
    sendBadRequest(res, message);
  }
});

// PUT /api/v1/contributions/:id
contributionRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const contribution = await contributionService.updateContribution(req.params.id, req.body);
    if (!contribution) {
      return sendNotFound(res, 'Contribution not found');
    }
    sendSuccess(res, contribution, 'Contribution updated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update contribution';
    sendError(res, message);
  }
});

// POST /api/v1/contributions/:id/confirm
contributionRoutes.post('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const contribution = await contributionService.confirmContribution(req.params.id);
    if (!contribution) {
      return sendNotFound(res, 'Contribution not found');
    }
    sendSuccess(res, contribution, 'Contribution confirmed successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to confirm contribution';
    sendError(res, message);
  }
});

// POST /api/v1/contributions/:id/reject
contributionRoutes.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const contribution = await contributionService.rejectContribution(req.params.id);
    if (!contribution) {
      return sendNotFound(res, 'Contribution not found');
    }
    sendSuccess(res, contribution, 'Contribution rejected successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reject contribution';
    sendError(res, message);
  }
});

// DELETE /api/v1/contributions/:id
contributionRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await contributionService.deleteContribution(req.params.id);
    if (!deleted) {
      return sendNotFound(res, 'Contribution not found');
    }
    sendSuccess(res, null, 'Contribution deleted successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete contribution';
    sendError(res, message);
  }
});

