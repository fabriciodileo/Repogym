import type { Request, Response } from 'express';

import { dashboardService } from './dashboard.service.js';

export const dashboardController = {
  async overview(req: Request, res: Response) {
    const result = await dashboardService.overview((req.query.branchId as string | undefined) ?? req.auth?.branchId ?? undefined);
    return res.json({ data: result });
  },
};
