import { z } from 'zod';

export const cashSessionIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const cashSessionsListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  branchId: z.string().cuid().optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
});

export const cashStatusQuerySchema = z.object({
  branchId: z.string().cuid().optional(),
});

export const openCashSessionSchema = z.object({
  branchId: z.string().cuid(),
  openingAmount: z.number().min(0),
  notes: z.string().optional(),
});

export const closeCashSessionSchema = z.object({
  closingAmount: z.number().min(0),
  notes: z.string().optional(),
});

export const createCashMovementSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'ADJUSTMENT']),
  amount: z.number().refine((value) => value !== 0, 'El monto no puede ser cero.'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'DEBIT_CARD', 'CREDIT_CARD', 'DIGITAL_WALLET', 'OTHER']).optional(),
  description: z.string().min(3),
  reference: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
