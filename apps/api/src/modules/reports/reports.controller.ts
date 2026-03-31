import type { Request, Response } from 'express';

import { reportsService } from './reports.service.js';

export const reportsController = {
  async detail(req: Request, res: Response) {
    const result = await reportsService.getReport(String(req.params.report), req.query);
    return res.json({ data: result });
  },

  async exportCsv(req: Request, res: Response) {
    const csv = await reportsService.exportCsv(String(req.params.report), req.query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${String(req.params.report)}.csv"`);
    return res.send(csv);
  },
};
