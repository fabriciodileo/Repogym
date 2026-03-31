import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../core/middleware/authorize.js';
import { validate } from '../../core/middleware/validate.js';
import { auditController } from './audit.controller.js';
import { auditListQuerySchema } from './audit.schemas.js';

export const auditRouter = Router();

auditRouter.use(authenticate, authorizeRoles('ADMIN', 'MANAGER'));
auditRouter.get('/', validate({ query: auditListQuerySchema }), asyncHandler(auditController.list));
