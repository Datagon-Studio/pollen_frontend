import { Router } from 'express';
import { accountRoutes } from './modules/account/account.routes.js';
import { memberRoutes } from './modules/member/member.controller.js';
import { fundRoutes } from './modules/fund/fund.controller.js';
import { contributionRoutes } from './modules/contribution/contribution.controller.js';
import { expenseRoutes } from './modules/expense/expense.controller.js';
import { reportingRoutes } from './modules/reporting/reporting.controller.js';
import { userRoutes } from './modules/user/user.routes.js';

export const routes = Router();

routes.use('/accounts', accountRoutes);
routes.use('/members', memberRoutes);
routes.use('/funds', fundRoutes);
routes.use('/contributions', contributionRoutes);
routes.use('/expenses', expenseRoutes);
routes.use('/reports', reportingRoutes);
routes.use('/users', userRoutes);

