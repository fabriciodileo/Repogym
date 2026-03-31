import type { Request, Response } from 'express';

import { membershipsService } from './memberships.service.js';

export const membershipsController = {
  async list(req: Request, res: Response) {
    const result = await membershipsService.list(req.query);
    return res.json(result);
  },

  async create(req: Request, res: Response) {
    const result = await membershipsService.create(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.status(201).json({ data: result });
  },

  async renew(req: Request, res: Response) {
    const result = await membershipsService.renew(req.params.id, req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.status(201).json({ data: result });
  },

  async changeStatus(req: Request, res: Response) {
    const result = await membershipsService.changeStatus(req.params.id, req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.json({ data: result });
  },
};
