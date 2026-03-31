import type { Request, Response } from 'express';

import { accessControlService } from './access-control.service.js';

export const accessControlController = {
  async validateAccess(req: Request, res: Response) {
    const result = await accessControlService.validateAccess(req.body, {
      userId: req.auth?.userId,
      branchId: req.auth?.branchId,
    });

    return res.status(result.allowed ? 200 : 403).json(result);
  },

  async listLogs(req: Request, res: Response) {
    const result = await accessControlService.listLogs(req.query);
    return res.json(result);
  },
};
