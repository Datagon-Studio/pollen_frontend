/**
 * Fund Settlement Routes
 *
 * Defines routes for the fund settlement module.
 */

import { Router } from 'express';
import { fundSettlementRoutes } from './fund-settlement.controller.js';
import { authenticateToken } from '../../shared/middleware/auth.middleware.js';

export const fundSettlementRoutesWithAuth = Router();

fundSettlementRoutesWithAuth.use(authenticateToken);
fundSettlementRoutesWithAuth.use('/', fundSettlementRoutes);
