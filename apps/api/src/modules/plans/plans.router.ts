import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../core/middleware/authorize.js';
import { validate } from '../../core/middleware/validate.js';
import { planIdParamSchema, plansListQuerySchema, createPlanSchema, updatePlanSchema } from './plans.schemas.js';
import { plansController } from './plans.controller.js';

export const plansRouter = Router();

plansRouter.use(authenticate);
plansRouter.get('/', validate({ query: plansListQuerySchema }), asyncHandler(plansController.list));
plansRouter.post('/', authorizeRoles('ADMIN', 'MANAGER'), validate({ body: createPlanSchema }), asyncHandler(plansController.create));
plansRouter.patch('/:id', authorizeRoles('ADMIN', 'MANAGER'), validate({ params: planIdParamSchema, body: updatePlanSchema }), asyncHandler(plansController.update));
plansRouter.delete('/:id', authorizeRoles('ADMIN', 'MANAGER'), validate({ params: planIdParamSchema }), asyncHandler(plansController.remove));
