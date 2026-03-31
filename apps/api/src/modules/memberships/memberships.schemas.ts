import { z } from 'zod';

export const membershipsListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  clientId: z.string().cuid().optional(),
  branchId: z.string().cuid().optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'EXPIRED', 'PAUSED', 'CANCELLED', 'FROZEN']).optional(),
});

export const createMembershipSchema = z.object({
  clientId: z.string().cuid(),
  planId: z.string().cuid(),
  branchId: z.string().cuid(),
  startsAt: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  agreedAmount: z.number().positive().optional(),
  discountAmount: z.number().min(0).optional(),
  surchargeAmount: z.number().min(0).optional(),
  autoRenew: z.boolean().optional(),
  notes: z.string().optional(),
});

export const renewMembershipSchema = createMembershipSchema.omit({ clientId: true, planId: true, branchId: true });

export const membershipStatusActionSchema = z.object({
  action: z.enum(['PAUSE', 'FREEZE', 'CANCEL', 'REACTIVATE']),
  reason: z.string().min(3),
  frozenUntil: z.coerce.date().optional(),
});

export const membershipIdParamSchema = z.object({ id: z.string().cuid() });
