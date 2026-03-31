import type { Request, Response } from 'express';

import { classesService } from './classes.service.js';

export const classesController = {
  async listActivities(req: Request, res: Response) {
    const result = await classesService.listActivities(req.query);
    return res.json({ data: result });
  },

  async createActivity(req: Request, res: Response) {
    const result = await classesService.createActivity(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });
    return res.status(201).json({ data: result });
  },

  async updateActivity(req: Request, res: Response) {
    const result = await classesService.updateActivity(String(req.params.id), req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });
    return res.json({ data: result });
  },

  async listSchedules(req: Request, res: Response) {
    const result = await classesService.listSchedules(req.query);
    return res.json({ data: result });
  },

  async createSchedule(req: Request, res: Response) {
    const result = await classesService.createSchedule(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });
    return res.status(201).json({ data: result });
  },

  async updateSchedule(req: Request, res: Response) {
    const result = await classesService.updateSchedule(String(req.params.id), req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });
    return res.json({ data: result });
  },

  async cancelSchedule(req: Request, res: Response) {
    const result = await classesService.cancelSchedule(String(req.params.id), req.body.reason, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });
    return res.json({ data: result });
  },

  async listEnrollments(req: Request, res: Response) {
    const result = await classesService.listEnrollments(req.query);
    return res.json({ data: result });
  },

  async enroll(req: Request, res: Response) {
    const result = await classesService.enroll(req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });
    return res.status(201).json({ data: result });
  },

  async cancelEnrollment(req: Request, res: Response) {
    const result = await classesService.cancelEnrollment(String(req.params.id), req.body.reason, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });
    return res.json({ data: result });
  },

  async attendance(req: Request, res: Response) {
    const result = await classesService.registerAttendance(String(req.params.id), req.body, {
      userId: req.auth!.userId,
      branchId: req.auth!.branchId,
    });
    return res.json({ data: result });
  },
};
