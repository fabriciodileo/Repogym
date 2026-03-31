import type { Request, Response } from 'express';

import { branchesService } from './branches.service.js';

export const branchesController = {
  async list(_req: Request, res: Response) {
    const result = await branchesService.list();
    return res.json({ data: result });
  },

  async create(req: Request, res: Response) {
    const result = await branchesService.create(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.status(201).json({ data: result });
  },

  async update(req: Request, res: Response) {
    const result = await branchesService.update(req.params.id, req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.json({ data: result });
  },
};
