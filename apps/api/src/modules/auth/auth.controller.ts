import type { Request, Response } from 'express';

import { authService } from './auth.service.js';

export const authController = {
  async login(req: Request, res: Response) {
    const result = await authService.login({
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    });

    return res.status(200).json(result);
  },

  async refresh(req: Request, res: Response) {
    const result = await authService.refresh(req.body);
    return res.status(200).json(result);
  },

  async logout(req: Request, res: Response) {
    const result = await authService.logout({
      userId: req.auth!.userId,
      refreshToken: req.body.refreshToken,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    });

    return res.status(200).json(result);
  },

  async me(req: Request, res: Response) {
    const result = await authService.getSession(req.auth!.userId);
    return res.status(200).json(result);
  },
};

