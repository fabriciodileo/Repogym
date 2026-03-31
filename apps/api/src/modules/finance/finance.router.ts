import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../core/middleware/authorize.js';
import { validate } from '../../core/middleware/validate.js';
import { financeController } from './finance.controller.js';
import { financeSummaryQuerySchema } from './finance.schemas.js';

export const financeRouter = Router();

financeRouter.use(authenticate);
financeRouter.get('/summary', authorizeRoles('ADMIN', 'MANAGER', 'COLLECTIONS'), validate({ query: financeSummaryQuerySchema }), asyncHandler(financeController.summary));
