/**
 * Expense Category Controller
 * 
 * Handles Express req and res for Expense Categories.
 */

import { Router, Request, Response } from 'express';
import { expenseCategoryRepository } from './expense-category.repository.js';
import { sendSuccess, sendError } from '../../shared/utils/api-response.js';

export const expenseCategoryRoutes = Router();

// GET /api/v1/expense-categories - Get all active expense categories (alphabetically sorted)
expenseCategoryRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await expenseCategoryRepository.findAll();
    sendSuccess(res, categories);
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to fetch expense categories');
  }
});
