import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { managerService } from './manager.service.js';

type ManagerHandler = (userId: string) => Promise<unknown>;

async function sendManagerData(
  req: AuthenticatedRequest,
  res: Response,
  handler: ManagerHandler
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const data = await handler(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load manager data';
    res.status(500).json({ success: false, error: message });
  }
}

export const managerController = {
  async getAccounts(req: AuthenticatedRequest, res: Response): Promise<void> {
    await sendManagerData(req, res, (userId) => managerService.getManagedAccounts(userId));
  },

  async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    await sendManagerData(req, res, (userId) => managerService.getDashboard(userId));
  },

  async getMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
    await sendManagerData(req, res, (userId) => managerService.getMembers(userId));
  },

  async getFunds(req: AuthenticatedRequest, res: Response): Promise<void> {
    await sendManagerData(req, res, (userId) => managerService.getFunds(userId));
  },

  async getContributions(req: AuthenticatedRequest, res: Response): Promise<void> {
    await sendManagerData(req, res, (userId) => managerService.getContributions(userId));
  },

  async getSettlements(req: AuthenticatedRequest, res: Response): Promise<void> {
    await sendManagerData(req, res, (userId) => managerService.getSettlements(userId));
  },
};
