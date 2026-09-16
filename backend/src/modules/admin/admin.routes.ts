import { Router } from 'express';
import { authenticateToken } from '../../shared/middleware/auth.middleware.js';
import { adminRoutes } from './admin.controller.js';

export const adminRoutesWithAuth = Router();

adminRoutesWithAuth.use(authenticateToken);
adminRoutesWithAuth.use('/', adminRoutes);
