import { Router } from 'express';
import { accountRoutes } from './modules/account/account.routes.js';
import { memberRoutesWithAuth } from './modules/member/member.routes.js';
import { fundRoutesWithAuth } from './modules/fund/fund.routes.js';
import { contributionRoutesWithAuth } from './modules/contribution/contribution.routes.js';
import { configRoutes } from './modules/config/config.routes.js';
import { expenseRoutesWithAuth } from './modules/expense/expense.routes.js';
import { expenseCategoryRoutes } from './modules/expense-category/expense-category.controller.js';
import { reportingRoutes } from './modules/reporting/reporting.controller.js';
import { userRoutes } from './modules/user/user.routes.js';
import { settlementRoutes } from './modules/settlement/settlement.controller.js';
import { paymentRoutes } from './modules/payment/payment.controller.js';
import { accountPublicPageRoutes } from './modules/account-public-page/account-public-page.routes.js';
import { auditRoutes } from './modules/audit/audit.controller.js';

export const routes = Router();

routes.use('/accounts', accountRoutes);
routes.use('/members', memberRoutesWithAuth);
routes.use('/funds', fundRoutesWithAuth);
routes.use('/contributions', contributionRoutesWithAuth);
routes.use('/expenses', expenseRoutesWithAuth);
routes.use('/expense-categories', expenseCategoryRoutes);
routes.use('/reports', reportingRoutes);
routes.use('/users', userRoutes);
routes.use('/settlements', settlementRoutes);
routes.use('/payments', paymentRoutes);
routes.use('/config', configRoutes);
routes.use('/account-public-pages', accountPublicPageRoutes);
routes.use('/audit-logs', auditRoutes);

