import type { RoleCode } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/app-error.js';

export const authorizeRoles = (...roles: RoleCode[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new AppError('Sesion no valida.', 401, 'UNAUTHENTICATED'));
    }

    if (!roles.includes(req.auth.role)) {
      return next(new AppError('No tienes permisos para esta accion.', 403, 'FORBIDDEN'));
    }

    return next();
  };
};

export const authorizePermissions = (...permissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new AppError('Sesion no valida.', 401, 'UNAUTHENTICATED'));
    }

    const hasPermission = permissions.every((permission) =>
      req.auth?.permissions.includes(permission),
    );

    if (!hasPermission) {
      return next(new AppError('No tienes permisos suficientes.', 403, 'FORBIDDEN'));
    }

    return next();
  };
};
