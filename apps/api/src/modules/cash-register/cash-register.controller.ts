import type { Request, Response } from 'express';

import { cashRegisterService } from './cash-register.service.js';

export const cashRegisterController = {
  async listSessions(req: Request, res: Response) {
    const result = await cashRegisterService.listSessions(req.query);
    return res.json(result);
  },

  async status(req: Request, res: Response) {
    const result = await cashRegisterService.getStatus((req.query.branchId as string | undefined) ?? req.auth?.branchId ?? undefined);
    return res.json({ data: result });
  },

  async open(req: Request, res: Response) {
    const result = await cashRegisterService.openSession(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.status(201).json({ data: result });
  },

  async detail(req: Request, res: Response) {
    const result = await cashRegisterService.getSession(String(req.params.id));
    return res.json({ data: result });
  },

  async addMovement(req: Request, res: Response) {
    const result = await cashRegisterService.addManualMovement(String(req.params.id), req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.status(201).json({ data: result });
  },

  async close(req: Request, res: Response) {
    const result = await cashRegisterService.closeSession(String(req.params.id), req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.json({ data: result });
  },
};
