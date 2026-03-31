import type { NextFunction, Request, Response } from 'express';

export const notFoundHandler = (_req: Request, res: Response, _next: NextFunction) => {
  return res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'El recurso solicitado no existe.',
    },
  });
};
