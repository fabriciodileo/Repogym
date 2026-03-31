import type { Request, Response } from 'express';

import { paymentsService } from './payments.service.js';

export const paymentsController = {
  async list(req: Request, res: Response) {
    const result = await paymentsService.list(req.query);
    return res.json(result);
  },

  async listDebts(req: Request, res: Response) {
    const result = await paymentsService.listDebts(req.query);
    return res.json({ data: result });
  },

  async create(req: Request, res: Response) {
    const result = await paymentsService.create(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.status(201).json({ data: result });
  },

  async void(req: Request, res: Response) {
    const result = await paymentsService.void(req.params.id, req.body.reason, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.json({ data: result });
  },
};
