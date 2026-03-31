import type { Request, Response } from 'express';

import { notificationsService } from './notifications.service.js';

export const notificationsController = {
  async list(req: Request, res: Response) {
    const result = await notificationsService.list(req.query);
    return res.json(result);
  },

  async create(req: Request, res: Response) {
    const result = await notificationsService.queue(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.status(201).json({ data: result });
  },

  async process(req: Request, res: Response) {
    const result = await notificationsService.processPending(req.body.limit, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.json({ data: result });
  },

  async sync(req: Request, res: Response) {
    const result = await notificationsService.syncOperationalAlerts(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.json({ data: result });
  },

  async markRead(req: Request, res: Response) {
    const result = await notificationsService.markRead(String(req.params.id), {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.json({ data: result });
  },
};
