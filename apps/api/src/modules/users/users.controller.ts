import type { Request, Response } from 'express';

import { usersService } from './users.service.js';

export const usersController = {
  async list(req: Request, res: Response) {
    const result = await usersService.list(req.query);
    return res.json(result);
  },

  async listRoles(_req: Request, res: Response) {
    const result = await usersService.listRoles();
    return res.json({ data: result });
  },

  async create(req: Request, res: Response) {
    const result = await usersService.create(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.status(201).json({ data: result });
  },

  async update(req: Request, res: Response) {
    const result = await usersService.update(String(req.params.id), req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.json({ data: result });
  },
};

