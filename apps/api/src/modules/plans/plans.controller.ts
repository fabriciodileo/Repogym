import type { Request, Response } from 'express';

import { plansService } from './plans.service.js';

export const plansController = {
  async list(req: Request, res: Response) {
    const result = await plansService.list(req.query.activeOnly as boolean | undefined);
    return res.json({ data: result });
  },

  async create(req: Request, res: Response) {
    const result = await plansService.create(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.status(201).json({ data: result });
  },

  async update(req: Request, res: Response) {
    const result = await plansService.update(req.params.id, req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.json({ data: result });
  },

  async remove(req: Request, res: Response) {
    const result = await plansService.softDelete(req.params.id, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.json({ data: result });
  },
};
