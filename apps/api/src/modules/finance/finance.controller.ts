import type { Request, Response } from 'express';

import { financeService } from './finance.service.js';

export const financeController = {
  async summary(req: Request, res: Response) {
    const result = await financeService.summary(req.query);
    return res.json({ data: result });
  },
};
