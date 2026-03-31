import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../core/middleware/authorize.js';
import { validate } from '../../core/middleware/validate.js';
import { cashRegisterController } from './cash-register.controller.js';
import {
  cashSessionIdParamSchema,
  cashSessionsListQuerySchema,
  cashStatusQuerySchema,
  closeCashSessionSchema,
  createCashMovementSchema,
  openCashSessionSchema,
} from './cash-register.schemas.js';

export const cashRegisterRouter = Router();

cashRegisterRouter.use(authenticate);
cashRegisterRouter.get('/sessions', validate({ query: cashSessionsListQuerySchema }), asyncHandler(cashRegisterController.listSessions));
cashRegisterRouter.get('/status', validate({ query: cashStatusQuerySchema }), asyncHandler(cashRegisterController.status));
cashRegisterRouter.get('/sessions/:id', validate({ params: cashSessionIdParamSchema }), asyncHandler(cashRegisterController.detail));
cashRegisterRouter.post('/open', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ body: openCashSessionSchema }), asyncHandler(cashRegisterController.open));
cashRegisterRouter.post('/sessions/:id/movements', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ params: cashSessionIdParamSchema, body: createCashMovementSchema }), asyncHandler(cashRegisterController.addMovement));
cashRegisterRouter.post('/sessions/:id/close', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ params: cashSessionIdParamSchema, body: closeCashSessionSchema }), asyncHandler(cashRegisterController.close));
