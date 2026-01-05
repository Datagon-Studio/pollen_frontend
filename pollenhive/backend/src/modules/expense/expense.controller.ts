import { Router, Request, Response } from 'express';
import { expenseService } from './expense.service.js';
import { sendSuccess, sendError, sendCreated, sendNotFound, sendBadRequest } from '../../shared/utils/api-response.js';

export const expenseRoutes = Router();

// GET /api/v1/expenses?accountId=xxx
expenseRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    if (!accountId) {
      return sendBadRequest(res, 'Account ID is required');
    }
    const expenses = await expenseService.getExpensesByAccount(accountId);
    sendSuccess(res, expenses);
  } catch (error) {
    sendError(res, 'Failed to fetch expenses');
  }
});

// GET /api/v1/expenses/visible?accountId=xxx
expenseRoutes.get('/visible', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    if (!accountId) {
      return sendBadRequest(res, 'Account ID is required');
    }
    const expenses = await expenseService.getVisibleExpenses(accountId);
    sendSuccess(res, expenses);
  } catch (error) {
    sendError(res, 'Failed to fetch visible expenses');
  }
});

// GET /api/v1/expenses/stats/:accountId
expenseRoutes.get('/stats/:accountId', async (req: Request, res: Response) => {
  try {
    const stats = await expenseService.getExpenseStats(req.params.accountId);
    sendSuccess(res, stats);
  } catch (error) {
    sendError(res, 'Failed to fetch expense stats');
  }
});

// GET /api/v1/expenses/category/:category?accountId=xxx
expenseRoutes.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    if (!accountId) {
      return sendBadRequest(res, 'Account ID is required');
    }
    const expenses = await expenseService.getExpensesByCategory(accountId, req.params.category);
    sendSuccess(res, expenses);
  } catch (error) {
    sendError(res, 'Failed to fetch expenses by category');
  }
});

// GET /api/v1/expenses/range?accountId=xxx&startDate=xxx&endDate=xxx
expenseRoutes.get('/range', async (req: Request, res: Response) => {
  try {
    const { accountId, startDate, endDate } = req.query as Record<string, string>;
    if (!accountId || !startDate || !endDate) {
      return sendBadRequest(res, 'Account ID, start date, and end date are required');
    }
    const expenses = await expenseService.getExpensesByDateRange(accountId, startDate, endDate);
    sendSuccess(res, expenses);
  } catch (error) {
    sendError(res, 'Failed to fetch expenses by date range');
  }
});

// GET /api/v1/expenses/:id
expenseRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const expense = await expenseService.getExpense(req.params.id);
    if (!expense) {
      return sendNotFound(res, 'Expense not found');
    }
    sendSuccess(res, expense);
  } catch (error) {
    sendError(res, 'Failed to fetch expense');
  }
});

// POST /api/v1/expenses
expenseRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const expense = await expenseService.createExpense(req.body);
    if (!expense) {
      return sendBadRequest(res, 'Failed to create expense');
    }
    sendCreated(res, expense, 'Expense created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create expense';
    sendBadRequest(res, message);
  }
});

// PUT /api/v1/expenses/:id
expenseRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const expense = await expenseService.updateExpense(req.params.id, req.body);
    if (!expense) {
      return sendNotFound(res, 'Expense not found');
    }
    sendSuccess(res, expense, 'Expense updated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update expense';
    sendError(res, message);
  }
});

// POST /api/v1/expenses/:id/toggle-visibility
expenseRoutes.post('/:id/toggle-visibility', async (req: Request, res: Response) => {
  try {
    const expense = await expenseService.toggleVisibility(req.params.id);
    if (!expense) {
      return sendNotFound(res, 'Expense not found');
    }
    sendSuccess(res, expense, 'Expense visibility toggled');
  } catch (error) {
    sendError(res, 'Failed to toggle expense visibility');
  }
});

// DELETE /api/v1/expenses/:id
expenseRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await expenseService.deleteExpense(req.params.id);
    if (!deleted) {
      return sendNotFound(res, 'Expense not found');
    }
    sendSuccess(res, null, 'Expense deleted successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete expense';
    sendError(res, message);
  }
});

