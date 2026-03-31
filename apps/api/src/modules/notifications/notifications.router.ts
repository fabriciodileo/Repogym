import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../core/middleware/authorize.js';
import { validate } from '../../core/middleware/validate.js';
import { notificationsController } from './notifications.controller.js';
import {
  createNotificationSchema,
  notificationIdParamSchema,
  notificationsListQuerySchema,
  notificationsProcessSchema,
  notificationsSyncSchema,
} from './notifications.schemas.js';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);
notificationsRouter.get('/', validate({ query: notificationsListQuerySchema }), asyncHandler(notificationsController.list));
notificationsRouter.post('/', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ body: createNotificationSchema }), asyncHandler(notificationsController.create));
notificationsRouter.post('/process', authorizeRoles('ADMIN', 'MANAGER'), validate({ body: notificationsProcessSchema }), asyncHandler(notificationsController.process));
notificationsRouter.post('/sync', authorizeRoles('ADMIN', 'MANAGER'), validate({ body: notificationsSyncSchema }), asyncHandler(notificationsController.sync));
notificationsRouter.post('/:id/read', validate({ params: notificationIdParamSchema }), asyncHandler(notificationsController.markRead));
