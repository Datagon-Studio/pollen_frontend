import { Router, Request, Response } from 'express';
import { adminService } from './admin.service.js';
import { adminCatalogService } from './admin-catalog.service.js';
import { AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import {
  assertStaffUser,
  assertPlatformAdmin,
  handleStaffError,
} from '../../shared/middleware/staff.middleware.js';
import { accountRepository } from '../account/account.repository.js';
import { AccountStatus } from '../account/account.entity.js';
import { auditRepository } from '../audit/audit.repository.js';

export const adminRoutes = Router();

/** GET /api/v1/admin/dashboard — platform-wide metrics */
adminRoutes.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await assertStaffUser(authReq.user?.id);
    const data = await adminService.getPlatformDashboard();
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleStaffError(error, res);
  }
});

/** GET /api/v1/admin/accounts — all accounts with summary stats */
adminRoutes.get('/accounts', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await assertStaffUser(authReq.user?.id);
    const data = await adminService.listAccounts();
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleStaffError(error, res);
  }
});

/** GET /api/v1/admin/accounts/:accountId/team — managers + officers */
adminRoutes.get('/accounts/:accountId/team', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await assertStaffUser(authReq.user?.id);
    const account = await accountRepository.findByAccountId(req.params.accountId);
    if (!account) {
      res.status(404).json({ success: false, error: 'Account not found' });
      return;
    }
    const data = await adminCatalogService.getAccountTeam(req.params.accountId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleStaffError(error, res);
  }
});

/** GET /api/v1/admin/accounts/:accountId/kyc */
adminRoutes.get('/accounts/:accountId/kyc', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await assertStaffUser(authReq.user?.id);
    const data = await adminCatalogService.getAccountKyc(req.params.accountId);
    if (!data) {
      res.status(404).json({ success: false, error: 'Account not found' });
      return;
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleStaffError(error, res);
  }
});

/** GET /api/v1/admin/accounts/:accountId */
adminRoutes.get('/accounts/:accountId', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await assertStaffUser(authReq.user?.id);
    const data = await adminService.getAccountDetail(req.params.accountId);
    if (!data) {
      res.status(404).json({ success: false, error: 'Account not found' });
      return;
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleStaffError(error, res);
  }
});

/** GET /api/v1/admin/audit-logs — platform or account-scoped */
adminRoutes.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await assertStaffUser(authReq.user?.id);
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const category =
      typeof req.query.category === 'string' ? req.query.category : undefined;
    const accountId =
      typeof req.query.accountId === 'string' ? req.query.accountId : undefined;

    const data = await auditRepository.findForAdmin({
      accountId,
      limit,
      category,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleStaffError(error, res);
  }
});

/** POST /api/v1/admin/accounts/:accountId/deactivate */
adminRoutes.post('/accounts/:accountId/deactivate', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await assertPlatformAdmin(authReq.user?.id);

    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      res.status(400).json({ success: false, error: 'Reason is required' });
      return;
    }

    const existing = await accountRepository.findByAccountId(req.params.accountId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Account not found' });
      return;
    }

    const account = await accountRepository.update(req.params.accountId, {
      status: AccountStatus.INACTIVE,
    });

    res.status(200).json({
      success: true,
      data: account,
      message: 'Account deactivated',
    });
  } catch (error) {
    handleStaffError(error, res);
  }
});

/** GET /api/v1/admin/members — all memberships across accounts */
adminRoutes.get('/members', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await assertStaffUser(authReq.user?.id);
    const verified = req.query.verified;
    const data = await adminCatalogService.listMembers({
      accountId: typeof req.query.accountId === 'string' ? req.query.accountId : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      verified:
        verified === 'true' ? true : verified === 'false' ? false : undefined,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleStaffError(error, res);
  }
});

/** GET /api/v1/admin/members/:memberId */
adminRoutes.get('/members/:memberId', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await assertStaffUser(authReq.user?.id);
    const scope = req.query.scope === 'all' ? 'all' : 'account';
    const data = await adminCatalogService.getMember(req.params.memberId, scope);
    if (!data) {
      res.status(404).json({ success: false, error: 'Member not found' });
      return;
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleStaffError(error, res);
  }
});

/** GET /api/v1/admin/funds */
adminRoutes.get('/funds', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await assertStaffUser(authReq.user?.id);
    const isActive = req.query.isActive;
    const isPublic = req.query.isPublic;
    const data = await adminCatalogService.listFunds({
      accountId: typeof req.query.accountId === 'string' ? req.query.accountId : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isPublic:
        isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleStaffError(error, res);
  }
});

/** GET /api/v1/admin/funds/:fundId */
adminRoutes.get('/funds/:fundId', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await assertStaffUser(authReq.user?.id);
    const data = await adminCatalogService.getFund(req.params.fundId);
    if (!data) {
      res.status(404).json({ success: false, error: 'Fund not found' });
      return;
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleStaffError(error, res);
  }
});

/** GET /api/v1/admin/contributions */
adminRoutes.get('/contributions', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await assertStaffUser(authReq.user?.id);
    const channel = req.query.channel;
    const data = await adminCatalogService.listContributions({
      accountId: typeof req.query.accountId === 'string' ? req.query.accountId : undefined,
      fundId: typeof req.query.fundId === 'string' ? req.query.fundId : undefined,
      channel: channel === 'online' || channel === 'offline' ? channel : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      dateFrom: typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined,
      dateTo: typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleStaffError(error, res);
  }
});

/** GET /api/v1/admin/contributions/:contributionId */
adminRoutes.get('/contributions/:contributionId', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await assertStaffUser(authReq.user?.id);
    const data = await adminCatalogService.getContribution(req.params.contributionId);
    if (!data) {
      res.status(404).json({ success: false, error: 'Contribution not found' });
      return;
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleStaffError(error, res);
  }
});

/** POST /api/v1/admin/accounts/:accountId/reactivate */
adminRoutes.post('/accounts/:accountId/reactivate', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await assertPlatformAdmin(authReq.user?.id);

    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      res.status(400).json({ success: false, error: 'Reason is required' });
      return;
    }

    const existing = await accountRepository.findByAccountId(req.params.accountId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Account not found' });
      return;
    }

    const account = await accountRepository.update(req.params.accountId, {
      status: AccountStatus.ACTIVE,
    });

    res.status(200).json({
      success: true,
      data: account,
      message: 'Account reactivated',
    });
  } catch (error) {
    handleStaffError(error, res);
  }
});
