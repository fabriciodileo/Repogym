import type { Request, Response } from 'express';

import { productsService } from './products.service.js';

export const productsController = {
  async list(req: Request, res: Response) {
    const result = await productsService.list(req.query);
    return res.json(result);
  },

  async listCategories(_req: Request, res: Response) {
    const result = await productsService.listCategories();
    return res.json({ data: result });
  },

  async createCategory(req: Request, res: Response) {
    const result = await productsService.createCategory(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });
    return res.status(201).json({ data: result });
  },

  async updateCategory(req: Request, res: Response) {
    const result = await productsService.updateCategory(String(req.params.id), req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });
    return res.json({ data: result });
  },

  async create(req: Request, res: Response) {
    const result = await productsService.create(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });
    return res.status(201).json({ data: result });
  },

  async update(req: Request, res: Response) {
    const result = await productsService.update(String(req.params.id), req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });
    return res.json({ data: result });
  },

  async remove(req: Request, res: Response) {
    const result = await productsService.remove(String(req.params.id), {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });
    return res.json({ data: result });
  },

  async listStockMovements(req: Request, res: Response) {
    const result = await productsService.listStockMovements(req.query);
    return res.json(result);
  },

  async createStockMovement(req: Request, res: Response) {
    const result = await productsService.recordStockMovement(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });
    return res.status(201).json({ data: result });
  },

  async createSale(req: Request, res: Response) {
    const result = await productsService.createSale(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });
    return res.status(201).json({ data: result });
  },
};
