import { Router } from 'express';

import { accessControlRouter } from '../modules/access-control/access-control.router.js';
import { auditRouter } from '../modules/audit/audit.router.js';
import { authRouter } from '../modules/auth/auth.router.js';
import { branchesRouter } from '../modules/branches/branches.router.js';
import { clientsRouter } from '../modules/clients/clients.router.js';
import { dashboardRouter } from '../modules/dashboard/dashboard.router.js';
import { membershipsRouter } from '../modules/memberships/memberships.router.js';
import { paymentsRouter } from '../modules/payments/payments.router.js';
import { plansRouter } from '../modules/plans/plans.router.js';
import { settingsRouter } from '../modules/settings/settings.router.js';
import { usersRouter } from '../modules/users/users.router.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/branches', branchesRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/clients', clientsRouter);
apiRouter.use('/plans', plansRouter);
apiRouter.use('/memberships', membershipsRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/access-control', accessControlRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/audit', auditRouter);
