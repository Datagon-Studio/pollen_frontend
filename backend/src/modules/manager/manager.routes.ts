import { Router } from 'express';
import {
  authenticateToken,
  AuthenticatedRequest,
} from '../../shared/middleware/auth.middleware.js';
import { managerController } from './manager.controller.js';

export const managerRoutes = Router();

managerRoutes.use(authenticateToken);

managerRoutes.get('/accounts', (req, res) =>
  managerController.getAccounts(req as AuthenticatedRequest, res)
);
managerRoutes.get('/dashboard', (req, res) =>
  managerController.getDashboard(req as AuthenticatedRequest, res)
);
managerRoutes.get('/members', (req, res) =>
  managerController.getMembers(req as AuthenticatedRequest, res)
);
managerRoutes.get('/funds', (req, res) =>
  managerController.getFunds(req as AuthenticatedRequest, res)
);
managerRoutes.get('/contributions', (req, res) =>
  managerController.getContributions(req as AuthenticatedRequest, res)
);
managerRoutes.get('/settlements', (req, res) =>
  managerController.getSettlements(req as AuthenticatedRequest, res)
);
