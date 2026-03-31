import type { Request, Response } from 'express';

import { clientsService } from './clients.service.js';

export const clientsController = {
  async list(req: Request, res: Response) {
    const result = await clientsService.list(req.query);
    return res.json(result);
  },

  async profile(req: Request, res: Response) {
    const result = await clientsService.getProfile(req.params.id);
    return res.json({ data: result });
  },

  async create(req: Request, res: Response) {
    const result = await clientsService.create(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.status(201).json({ data: result });
  },

  async update(req: Request, res: Response) {
    const result = await clientsService.update(req.params.id, req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.json({ data: result });
  },

  async remove(req: Request, res: Response) {
    const result = await clientsService.softDelete(req.params.id, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.json({ data: result });
  },
};
