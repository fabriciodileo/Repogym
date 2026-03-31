import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../core/middleware/authorize.js';
import { validate } from '../../core/middleware/validate.js';
import { reportsController } from './reports.controller.js';
import { reportIdParamSchema, reportsQuerySchema } from './reports.schemas.js';

export const reportsRouter = Router();

reportsRouter.use(authenticate);
reportsRouter.get('/:report', authorizeRoles('ADMIN', 'MANAGER', 'COLLECTIONS', 'RECEPTIONIST'), validate({ params: reportIdParamSchema, query: reportsQuerySchema }), asyncHandler(reportsController.detail));
reportsRouter.get('/:report/export/csv', authorizeRoles('ADMIN', 'MANAGER', 'COLLECTIONS', 'RECEPTIONIST'), validate({ params: reportIdParamSchema, query: reportsQuerySchema }), asyncHandler(reportsController.exportCsv));
