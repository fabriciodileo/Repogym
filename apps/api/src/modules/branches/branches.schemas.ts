import { z } from 'zod';

const operatingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  opensAt: z.string().regex(/^\d{2}:\d{2}$/),
  closesAt: z.string().regex(/^\d{2}:\d{2}$/),
  isClosed: z.boolean().optional(),
});

export const branchCreateSchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  timezone: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
  independentCashRegister: z.boolean().optional(),
  operatingHours: z.array(operatingHourSchema).default([]),
});

export const branchUpdateSchema = branchCreateSchema.partial();
export const branchIdParamSchema = z.object({ id: z.string().cuid() });
