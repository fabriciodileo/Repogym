import type { Request, Response } from 'express';

import { settingsService } from './settings.service.js';

export const settingsController = {
  async list(_req: Request, res: Response) {
    const result = await settingsService.list();
    return res.json({ data: result });
  },

  async bulkUpsert(req: Request, res: Response) {
    const result = await settingsService.bulkUpsert(req.body.items, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.json({ data: result });
  },
};
