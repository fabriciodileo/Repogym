import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/app-error.js';
import { verifyAccessToken } from '../../lib/jwt.js';

const getBearerToken = (request: Request) => {
  const header = request.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.replace('Bearer ', '').trim();
};

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const token = getBearerToken(req);

  if (!token) {
    return next(new AppError('Debes iniciar sesion para continuar.', 401, 'UNAUTHENTICATED'));
  }

  req.auth = verifyAccessToken(token);
  return next();
};
