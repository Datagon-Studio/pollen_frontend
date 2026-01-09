import { Router } from 'express';
import { accountRoutes } from './modules/account/account.routes.js';
import { memberRoutesWithAuth } from './modules/member/member.routes.js';
import { fundRoutesWithAuth } from './modules/fund/fund.routes.js';
import { contributionRoutes } from './modules/contribution/contribution.controller.js';
import { expenseRoutesWithAuth } from './modules/expense/expense.routes.js';
import { reportingRoutes } from './modules/reporting/reporting.controller.js';
import { userRoutes } from './modules/user/user.routes.js';

export const routes = Router();

routes.use('/accounts', accountRoutes);
routes.use('/members', memberRoutesWithAuth);
routes.use('/funds', fundRoutesWithAuth);
routes.use('/contributions', contributionRoutes);
routes.use('/expenses', expenseRoutesWithAuth);
routes.use('/reports', reportingRoutes);
routes.use('/users', userRoutes);

