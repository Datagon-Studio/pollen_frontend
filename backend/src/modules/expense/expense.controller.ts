/**
 * Expense Controller
 * 
 * Handles Express req and res.
 * Calls service methods.
 * Converts thrown errors into HTTP responses.
 * No Supabase usage here.
 */

import { Router, Request, Response } from 'express';
import { expenseService } from './expense.service.js';
import { CreateExpenseInput, UpdateExpenseInput } from './expense.entity.js';
import { AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { accountService } from '../account/account.service.js';

export const expenseRoutes = Router();

/**
 * GET /api/v1/expenses
 * Get all expenses for the authenticated user's account
 */
expenseRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Get user's account
    const account = await accountService.getUserAccount(userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const expenses = await expenseService.getExpensesByAccount(account.account_id);
    res.status(200).json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch expenses';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/v1/expenses/visible
 * Get visible expenses for the authenticated user's account
 */
expenseRoutes.get('/visible', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Get user's account
    const account = await accountService.getUserAccount(userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const expenses = await expenseService.getVisibleExpenses(account.account_id);
    res.status(200).json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch visible expenses';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/v1/expenses/stats
 * Get expense statistics for the authenticated user's account
 */
expenseRoutes.get('/stats', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Get user's account
    const account = await accountService.getUserAccount(userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const stats = await expenseService.getExpenseStats(account.account_id);
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch expense stats';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/v1/expenses/category/:category
 * Get expenses by category for the authenticated user's account
 */
expenseRoutes.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Get user's account
    const account = await accountService.getUserAccount(userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const expenses = await expenseService.getExpensesByCategory(account.account_id, req.params.category);
    res.status(200).json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch expenses by category';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/v1/expenses/range
 * Get expenses by date range for the authenticated user's account
 */
expenseRoutes.get('/range', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    const { startDate, endDate } = req.query as Record<string, string>;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required',
      });
    }

    // Get user's account
    const account = await accountService.getUserAccount(userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const expenses = await expenseService.getExpensesByDateRange(account.account_id, startDate, endDate);
    res.status(200).json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch expenses by date range';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/v1/expenses/:id
 * Get a specific expense by ID
 */
expenseRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const expense = await expenseService.getExpense(req.params.id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }
    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch expense';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/expenses
 * Create a new expense
 */
expenseRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Get user's account
    const account = await accountService.getUserAccount(userId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const input: CreateExpenseInput = {
      account_id: account.account_id,
      expense_name: req.body.expense_name,
      expense_category: req.body.expense_category,
      date: req.body.date,
      amount: req.body.amount,
      created_by_user_id: userId,
      notes: req.body.notes,
      member_visible: req.body.member_visible,
    };

    const expense = await expenseService.createExpense(input);
    res.status(201).json({
      success: true,
      data: expense,
      message: 'Expense created successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create expense';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
});

/**
 * PUT /api/v1/expenses/:id
 * Update an expense
 */
expenseRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const input: UpdateExpenseInput = {
      expense_name: req.body.expense_name,
      expense_category: req.body.expense_category,
      date: req.body.date,
      amount: req.body.amount,
      notes: req.body.notes,
      member_visible: req.body.member_visible,
    };

    const expense = await expenseService.updateExpense(req.params.id, input);
    res.status(200).json({
      success: true,
      data: expense,
      message: 'Expense updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update expense';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/v1/expenses/:id/toggle-visibility
 * Toggle expense visibility
 */
expenseRoutes.post('/:id/toggle-visibility', async (req: Request, res: Response) => {
  try {
    const expense = await expenseService.toggleVisibility(req.params.id);
    res.status(200).json({
      success: true,
      data: expense,
      message: 'Expense visibility toggled',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to toggle expense visibility';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

/**
 * DELETE /api/v1/expenses/:id
 * Delete an expense
 */
expenseRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    await expenseService.deleteExpense(req.params.id);
    res.status(200).json({
      success: true,
      data: null,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete expense';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});
