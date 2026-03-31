import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authRateLimiter } from '../../core/middleware/rate-limit.js';
import { validate } from '../../core/middleware/validate.js';
import { authController } from './auth.controller.js';
import { loginSchema, logoutSchema, refreshSchema } from './auth.schemas.js';

export const authRouter = Router();

authRouter.post('/login', authRateLimiter, validate({ body: loginSchema }), asyncHandler(authController.login));
authRouter.post('/refresh', authRateLimiter, validate({ body: refreshSchema }), asyncHandler(authController.refresh));
authRouter.post('/logout', authenticate, validate({ body: logoutSchema }), asyncHandler(authController.logout));
authRouter.get('/me', authenticate, asyncHandler(authController.me));
