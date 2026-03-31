import type { Request, Response } from 'express';

import { auditService } from './audit.service.js';

export const auditController = {
  async list(req: Request, res: Response) {
    const logs = await auditService.list(req.query.limit as number | undefined);
    return res.json({ data: logs });
  },
};
