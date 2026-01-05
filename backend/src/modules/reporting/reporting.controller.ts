import { Router, Request, Response } from 'express';
import { reportingService } from './reporting.service.js';
import { sendSuccess, sendError, sendBadRequest } from '../../shared/utils/api-response.js';

export const reportingRoutes = Router();

// GET /api/v1/reports/dashboard?accountId=xxx
reportingRoutes.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    if (!accountId) {
      return sendBadRequest(res, 'Account ID is required');
    }
    const stats = await reportingService.getDashboardStats(accountId);
    sendSuccess(res, stats);
  } catch (error) {
    sendError(res, 'Failed to fetch dashboard stats');
  }
});

// GET /api/v1/reports/monthly?accountId=xxx&months=6
reportingRoutes.get('/monthly', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    const months = parseInt(req.query.months as string) || 6;
    if (!accountId) {
      return sendBadRequest(res, 'Account ID is required');
    }
    const data = await reportingService.getMonthlyOverview(accountId, months);
    sendSuccess(res, data);
  } catch (error) {
    sendError(res, 'Failed to fetch monthly overview');
  }
});

// GET /api/v1/reports/fund-breakdown?accountId=xxx
reportingRoutes.get('/fund-breakdown', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    if (!accountId) {
      return sendBadRequest(res, 'Account ID is required');
    }
    const breakdown = await reportingService.getFundBreakdown(accountId);
    sendSuccess(res, breakdown);
  } catch (error) {
    sendError(res, 'Failed to fetch fund breakdown');
  }
});

// GET /api/v1/reports/contributions-by-period?accountId=xxx&startDate=xxx&endDate=xxx&groupBy=month
reportingRoutes.get('/contributions-by-period', async (req: Request, res: Response) => {
  try {
    const { accountId, startDate, endDate, groupBy } = req.query as Record<string, string>;
    if (!accountId || !startDate || !endDate) {
      return sendBadRequest(res, 'Account ID, start date, and end date are required');
    }
    const validGroupBy = ['day', 'week', 'month'].includes(groupBy) ? groupBy as 'day' | 'week' | 'month' : 'month';
    const data = await reportingService.getContributionsByPeriod(accountId, startDate, endDate, validGroupBy);
    sendSuccess(res, data);
  } catch (error) {
    sendError(res, 'Failed to fetch contributions by period');
  }
});

// GET /api/v1/reports/expenses-summary?accountId=xxx
reportingRoutes.get('/expenses-summary', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    if (!accountId) {
      return sendBadRequest(res, 'Account ID is required');
    }
    const summary = await reportingService.getExpensesSummary(accountId);
    sendSuccess(res, summary);
  } catch (error) {
    sendError(res, 'Failed to fetch expenses summary');
  }
});

// GET /api/v1/reports/net-position?accountId=xxx
reportingRoutes.get('/net-position', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string;
    if (!accountId) {
      return sendBadRequest(res, 'Account ID is required');
    }
    const position = await reportingService.getNetPosition(accountId);
    sendSuccess(res, position);
  } catch (error) {
    sendError(res, 'Failed to fetch net position');
  }
});

