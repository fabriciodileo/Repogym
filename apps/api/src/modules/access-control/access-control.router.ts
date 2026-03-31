import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { validate } from '../../core/middleware/validate.js';
import { accessControlController } from './access-control.controller.js';
import { accessLogsQuerySchema, validateAccessSchema } from './access-control.schemas.js';

export const accessControlRouter = Router();

accessControlRouter.use(authenticate);
accessControlRouter.post('/validate', validate({ body: validateAccessSchema }), asyncHandler(accessControlController.validateAccess));
accessControlRouter.get('/logs', validate({ query: accessLogsQuerySchema }), asyncHandler(accessControlController.listLogs));
