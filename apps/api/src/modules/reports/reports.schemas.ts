import { z } from 'zod';

export const reportIdParamSchema = z.object({
  report: z.enum([
    'clients-status',
    'memberships-expiring',
    'income',
    'expenses',
    'balance',
    'accesses',
    'top-plans',
    'payment-methods',
    'class-attendance',
    'low-stock',
  ]),
});

export const reportsQuerySchema = z.object({
  branchId: z.string().cuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  status: z.string().optional(),
});
