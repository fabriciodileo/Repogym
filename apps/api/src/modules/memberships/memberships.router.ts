import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../core/middleware/authorize.js';
import { validate } from '../../core/middleware/validate.js';
import { membershipsController } from './memberships.controller.js';
import {
  createMembershipSchema,
  membershipIdParamSchema,
  membershipsListQuerySchema,
  membershipStatusActionSchema,
  renewMembershipSchema,
} from './memberships.schemas.js';

export const membershipsRouter = Router();

membershipsRouter.use(authenticate);
membershipsRouter.get('/', validate({ query: membershipsListQuerySchema }), asyncHandler(membershipsController.list));
membershipsRouter.post('/', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ body: createMembershipSchema }), asyncHandler(membershipsController.create));
membershipsRouter.post('/:id/renew', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ params: membershipIdParamSchema, body: renewMembershipSchema }), asyncHandler(membershipsController.renew));
membershipsRouter.post('/:id/status', authorizeRoles('ADMIN', 'MANAGER'), validate({ params: membershipIdParamSchema, body: membershipStatusActionSchema }), asyncHandler(membershipsController.changeStatus));
