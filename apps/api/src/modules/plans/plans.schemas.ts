import { z } from 'zod';

const timeRuleSchema = z.object({
  branchId: z.string().cuid().optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const plansListQuerySchema = z.object({
  activeOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value ? value === 'true' : undefined)),
});

export const createPlanSchema = z.object({
  code: z.string().min(2).max(40),
  name: z.string().min(2),
  description: z.string().optional(),
  durationUnit: z.enum(['DAY', 'WEEK', 'MONTH', 'QUARTER', 'SEMESTER', 'YEAR', 'CUSTOM']),
  durationCount: z.number().int().positive(),
  price: z.number().positive(),
  accessLimit: z.number().int().positive().optional().nullable(),
  allowFreeze: z.boolean().optional(),
  lateFeeEnabled: z.boolean().optional(),
  lateFeePercent: z.number().min(0).max(100).optional().nullable(),
  graceDays: z.number().int().min(0).optional(),
  autoRenewEnabled: z.boolean().optional(),
  includesSpecialClasses: z.boolean().optional(),
  isActive: z.boolean().optional(),
  branchIds: z.array(z.string().cuid()).default([]),
  timeRules: z.array(timeRuleSchema).default([]),
});

export const updatePlanSchema = createPlanSchema.partial();
export const planIdParamSchema = z.object({ id: z.string().cuid() });
