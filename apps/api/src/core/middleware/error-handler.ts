import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';

import { AppError } from '../errors/app-error.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son validos.',
        details: error.flatten(),
      },
    });
  }

  if (error instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'La sesion no es valida.',
      },
    });
  }

  logger.error(
    {
      err: error,
      path: req.path,
      method: req.method,
    },
    'Unhandled application error',
  );

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        env.NODE_ENV === 'production'
          ? 'Ocurrio un error interno.'
          : error instanceof Error
            ? error.message
            : 'Ocurrio un error interno.',
    },
  });
};
