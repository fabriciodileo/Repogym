import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../core/middleware/authorize.js';
import { validate } from '../../core/middleware/validate.js';
import { clientsController } from './clients.controller.js';
import {
  clientIdParamSchema,
  clientsListQuerySchema,
  createClientSchema,
  updateClientSchema,
} from './clients.schemas.js';

export const clientsRouter = Router();

clientsRouter.use(authenticate);
clientsRouter.get('/', validate({ query: clientsListQuerySchema }), asyncHandler(clientsController.list));
clientsRouter.get('/:id/profile', validate({ params: clientIdParamSchema }), asyncHandler(clientsController.profile));
clientsRouter.post('/', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ body: createClientSchema }), asyncHandler(clientsController.create));
clientsRouter.patch('/:id', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ params: clientIdParamSchema, body: updateClientSchema }), asyncHandler(clientsController.update));
clientsRouter.delete('/:id', authorizeRoles('ADMIN', 'MANAGER'), validate({ params: clientIdParamSchema }), asyncHandler(clientsController.remove));
