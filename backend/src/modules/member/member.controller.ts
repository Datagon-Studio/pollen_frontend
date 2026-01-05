import { Router, Request, Response } from 'express';
import { memberService } from './member.service.js';
import { sendSuccess, sendError, sendCreated, sendNotFound, sendBadRequest } from '../../shared/utils/api-response.js';

export const memberRoutes = Router();

// GET /api/v1/members?accountId=xxx
memberRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    if (!accountId) {
      return sendBadRequest(res, 'Account ID is required');
    }
    const members = await memberService.getMembersByAccount(accountId);
    sendSuccess(res, members);
  } catch (error) {
    sendError(res, 'Failed to fetch members');
  }
});

// GET /api/v1/members/:id
memberRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const member = await memberService.getMember(req.params.id);
    if (!member) {
      return sendNotFound(res, 'Member not found');
    }
    sendSuccess(res, member);
  } catch (error) {
    sendError(res, 'Failed to fetch member');
  }
});

// GET /api/v1/members/stats?accountId=xxx
memberRoutes.get('/stats/:accountId', async (req: Request, res: Response) => {
  try {
    const stats = await memberService.getMemberStats(req.params.accountId);
    sendSuccess(res, stats);
  } catch (error) {
    sendError(res, 'Failed to fetch member stats');
  }
});

// POST /api/v1/members
memberRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const member = await memberService.createMember(req.body);
    if (!member) {
      return sendBadRequest(res, 'Failed to create member');
    }
    sendCreated(res, member, 'Member created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create member';
    sendBadRequest(res, message);
  }
});

// PUT /api/v1/members/:id
memberRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const member = await memberService.updateMember(req.params.id, req.body);
    if (!member) {
      return sendNotFound(res, 'Member not found');
    }
    sendSuccess(res, member, 'Member updated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update member';
    sendError(res, message);
  }
});

// DELETE /api/v1/members/:id
memberRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await memberService.deleteMember(req.params.id);
    if (!deleted) {
      return sendNotFound(res, 'Member not found');
    }
    sendSuccess(res, null, 'Member deleted successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete member';
    sendError(res, message);
  }
});

// POST /api/v1/members/:id/verify-phone
memberRoutes.post('/:id/verify-phone', async (req: Request, res: Response) => {
  try {
    const member = await memberService.verifyPhone(req.params.id);
    if (!member) {
      return sendNotFound(res, 'Member not found');
    }
    sendSuccess(res, member, 'Phone verified successfully');
  } catch (error) {
    sendError(res, 'Failed to verify phone');
  }
});

// POST /api/v1/members/:id/verify-email
memberRoutes.post('/:id/verify-email', async (req: Request, res: Response) => {
  try {
    const member = await memberService.verifyEmail(req.params.id);
    if (!member) {
      return sendNotFound(res, 'Member not found');
    }
    sendSuccess(res, member, 'Email verified successfully');
  } catch (error) {
    sendError(res, 'Failed to verify email');
  }
});

