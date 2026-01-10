/**
 * Expense Routes
 * 
 * Defines routes for the expense module.
 */

import { Router } from 'express';
import { expenseRoutes } from './expense.controller.js';
import { authenticateToken } from '../../shared/middleware/auth.middleware.js';

export const expenseRoutesWithAuth = Router();

// Public route (no auth required) - must be before auth middleware
expenseRoutesWithAuth.get('/public/:accountId', expenseRoutes);

// All other expense routes require authentication
expenseRoutesWithAuth.use(authenticateToken);
expenseRoutesWithAuth.use('/', expenseRoutes);


