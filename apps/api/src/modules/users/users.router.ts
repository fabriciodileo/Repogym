import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../core/middleware/authorize.js';
import { validate } from '../../core/middleware/validate.js';
import { usersController } from './users.controller.js';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  userListQuerySchema,
} from './users.schemas.js';

export const usersRouter = Router();

usersRouter.use(authenticate);
usersRouter.get('/roles', authorizeRoles('ADMIN', 'MANAGER'), asyncHandler(usersController.listRoles));
usersRouter.get('/', authorizeRoles('ADMIN', 'MANAGER'), validate({ query: userListQuerySchema }), asyncHandler(usersController.list));
usersRouter.post('/', authorizeRoles('ADMIN'), validate({ body: createUserSchema }), asyncHandler(usersController.create));
usersRouter.patch('/:id', authorizeRoles('ADMIN'), validate({ params: userIdParamSchema, body: updateUserSchema }), asyncHandler(usersController.update));
