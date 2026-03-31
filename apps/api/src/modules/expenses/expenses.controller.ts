import type { Request, Response } from 'express';

import { expensesService } from './expenses.service.js';

export const expensesController = {
  async list(req: Request, res: Response) {
    const result = await expensesService.list(req.query);
    return res.json(result);
  },

  async summary(req: Request, res: Response) {
    const result = await expensesService.summary(req.query);
    return res.json({ data: result });
  },

  async listCategories(req: Request, res: Response) {
    const result = await expensesService.listCategories(req.query);
    return res.json({ data: result });
  },

  async createCategory(req: Request, res: Response) {
    const result = await expensesService.createCategory(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.status(201).json({ data: result });
  },

  async updateCategory(req: Request, res: Response) {
    const result = await expensesService.updateCategory(String(req.params.id), req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.json({ data: result });
  },

  async create(req: Request, res: Response) {
    const result = await expensesService.create(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.status(201).json({ data: result });
  },

  async update(req: Request, res: Response) {
    const result = await expensesService.update(String(req.params.id), req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.json({ data: result });
  },

  async remove(req: Request, res: Response) {
    const result = await expensesService.remove(String(req.params.id), {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });

    return res.json({ data: result });
  },
};
