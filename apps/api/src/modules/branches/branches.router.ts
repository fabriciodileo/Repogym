import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../core/middleware/authorize.js';
import { validate } from '../../core/middleware/validate.js';
import { branchesController } from './branches.controller.js';
import { branchCreateSchema, branchIdParamSchema, branchUpdateSchema } from './branches.schemas.js';

export const branchesRouter = Router();

branchesRouter.use(authenticate);
branchesRouter.get('/', asyncHandler(branchesController.list));
branchesRouter.post('/', authorizeRoles('ADMIN', 'MANAGER'), validate({ body: branchCreateSchema }), asyncHandler(branchesController.create));
branchesRouter.patch('/:id', authorizeRoles('ADMIN', 'MANAGER'), validate({ params: branchIdParamSchema, body: branchUpdateSchema }), asyncHandler(branchesController.update));
