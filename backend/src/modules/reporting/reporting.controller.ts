import { Router, Request, Response } from 'express';
import { reportingService, ReportWindow } from './reporting.service.js';
import { sendSuccess, sendError, sendBadRequest } from '../../shared/utils/api-response.js';

export const reportingRoutes = Router();

function toUtcBound(value: string, bound: 'start' | 'end'): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(
    year,
    month - 1,
    day,
    bound === 'start' ? 0 : 23,
    bound === 'start' ? 0 : 59,
    bound === 'start' ? 0 : 59,
    bound === 'start' ? 0 : 999,
  ));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString();
}

function readReportWindow(req: Request): ReportWindow | { error: string } | undefined {
  const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : '';
  const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : '';
  const monthRaw = typeof req.query.month === 'string' ? req.query.month : '';
  const yearsRaw = typeof req.query.years === 'string' ? req.query.years : '';

  if (!startDate && !endDate && !monthRaw && !yearsRaw) return undefined;
  if (!startDate || !endDate) {
    return { error: 'Start date and end date are required' };
  }

  const startIso = toUtcBound(startDate, 'start');
  const endIso = toUtcBound(endDate, 'end');
  if (!startIso || !endIso) {
    return { error: 'Dates must be valid YYYY-MM-DD values' };
  }
  if (startIso > endIso) {
    return { error: 'Start date must be on or before the end date' };
  }

  const start = new Date(startIso);
  const end = new Date(endIso);
  const span = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
  if (span > 240) {
    return { error: 'Choose a range of 20 years or less' };
  }

  let month: number | undefined;
  if (monthRaw) {
    month = Number(monthRaw);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return { error: 'Month must be a number from 1 to 12' };
    }
  }

  let years: number[] | undefined;
  if (yearsRaw) {
    const parsed = yearsRaw.split(',').map((part) => Number(part.trim()));
    if (
      parsed.length === 0 ||
      parsed.some((year) => !Number.isInteger(year) || year < 1900 || year > 2100)
    ) {
      return { error: 'Years must be a comma-separated list of years' };
    }
    years = [...new Set(parsed)].sort((a, b) => a - b);
    if (years.length > 20) {
      return { error: 'Select 20 years or fewer' };
    }
  }

  return { startIso, endIso, month, years };
}

function beginReport(
  req: Request,
  res: Response,
): { accountId: string; window?: ReportWindow } | undefined {
  const accountId = req.query.accountId as string;
  if (!accountId) {
    sendBadRequest(res, 'Account ID is required');
    return;
  }

  const windowResult = readReportWindow(req);
  if (windowResult && 'error' in windowResult) {
    sendBadRequest(res, windowResult.error);
    return;
  }

  return { accountId, window: windowResult };
}

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
// Optional: startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&month=1-12&years=2024,2025
reportingRoutes.get('/monthly', async (req: Request, res: Response) => {
  try {
    const parsed = beginReport(req, res);
    if (!parsed) return;
    const months = parseInt(req.query.months as string) || 6;
    const data = await reportingService.getMonthlyOverview(parsed.accountId, months, parsed.window);
    sendSuccess(res, data);
  } catch (error) {
    sendError(res, 'Failed to fetch monthly overview');
  }
});

// GET /api/v1/reports/fund-breakdown?accountId=xxx
reportingRoutes.get('/fund-breakdown', async (req: Request, res: Response) => {
  try {
    const parsed = beginReport(req, res);
    if (!parsed) return;
    const breakdown = await reportingService.getFundBreakdown(parsed.accountId, parsed.window);
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
    const parsed = beginReport(req, res);
    if (!parsed) return;
    const position = await reportingService.getNetPosition(parsed.accountId, parsed.window);
    sendSuccess(res, position);
  } catch (error) {
    sendError(res, 'Failed to fetch net position');
  }
});

// GET /api/v1/reports/payment-channels?accountId=xxx&months=6
reportingRoutes.get('/payment-channels', async (req: Request, res: Response) => {
  try {
    const parsed = beginReport(req, res);
    if (!parsed) return;
    const months = parseInt(req.query.months as string) || 6;
    const breakdown = await reportingService.getPaymentChannelBreakdown(
      parsed.accountId,
      months,
      parsed.window,
    );
    sendSuccess(res, breakdown);
  } catch (error) {
    sendError(res, 'Failed to fetch payment channel breakdown');
  }
});

