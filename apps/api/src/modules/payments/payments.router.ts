import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../core/middleware/authorize.js';
import { validate } from '../../core/middleware/validate.js';
import { paymentsController } from './payments.controller.js';
import {
  createPaymentSchema,
  debtsListQuerySchema,
  paymentIdParamSchema,
  paymentsListQuerySchema,
  voidPaymentSchema,
} from './payments.schemas.js';

export const paymentsRouter = Router();

paymentsRouter.use(authenticate);
paymentsRouter.get('/', validate({ query: paymentsListQuerySchema }), asyncHandler(paymentsController.list));
paymentsRouter.get('/debts', validate({ query: debtsListQuerySchema }), asyncHandler(paymentsController.listDebts));
paymentsRouter.post('/', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST', 'COLLECTIONS'), validate({ body: createPaymentSchema }), asyncHandler(paymentsController.create));
paymentsRouter.post('/:id/void', authorizeRoles('ADMIN', 'MANAGER', 'COLLECTIONS'), validate({ params: paymentIdParamSchema, body: voidPaymentSchema }), asyncHandler(paymentsController.void));
