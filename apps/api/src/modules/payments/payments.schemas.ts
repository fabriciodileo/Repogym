import { z } from 'zod';

const paymentAllocationSchema = z.object({
  receivableId: z.string().cuid(),
  amount: z.number().positive(),
});

export const paymentsListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  clientId: z.string().cuid().optional(),
  branchId: z.string().cuid().optional(),
});

export const debtsListQuerySchema = z.object({
  clientId: z.string().cuid().optional(),
  branchId: z.string().cuid().optional(),
  overdueOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value ? value === 'true' : undefined)),
});

export const createPaymentSchema = z.object({
  clientId: z.string().cuid().optional(),
  branchId: z.string().cuid(),
  concept: z.string().min(3),
  grossAmount: z.number().positive(),
  discountAmount: z.number().min(0).optional(),
  surchargeAmount: z.number().min(0).optional(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'DEBIT_CARD', 'CREDIT_CARD', 'DIGITAL_WALLET', 'OTHER']),
  reference: z.string().optional(),
  notes: z.string().optional(),
  paidAt: z.coerce.date().optional(),
  allocations: z.array(paymentAllocationSchema).default([]),
});

export const voidPaymentSchema = z.object({
  reason: z.string().min(3),
});

export const paymentIdParamSchema = z.object({ id: z.string().cuid() });
