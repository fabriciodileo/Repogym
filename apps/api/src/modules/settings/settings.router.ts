import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../core/middleware/authorize.js';
import { validate } from '../../core/middleware/validate.js';
import { settingsController } from './settings.controller.js';
import { bulkUpsertSettingsSchema } from './settings.schemas.js';

export const settingsRouter = Router();

settingsRouter.use(authenticate);
settingsRouter.get('/', asyncHandler(settingsController.list));
settingsRouter.post('/bulk', authorizeRoles('ADMIN', 'MANAGER'), validate({ body: bulkUpsertSettingsSchema }), asyncHandler(settingsController.bulkUpsert));
