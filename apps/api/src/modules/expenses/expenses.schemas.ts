import { z } from 'zod';

export const expenseCategoryIdParamSchema = z.object({ id: z.string().cuid() });
export const expenseIdParamSchema = z.object({ id: z.string().cuid() });

export const expenseCategoriesQuerySchema = z.object({
  type: z
    .enum([
      'RENT',
      'SERVICES',
      'MAINTENANCE',
      'CLEANING',
      'SALARIES',
      'SUPPLIES',
      'MARKETING',
      'TAXES',
      'REPAIRS',
      'PURCHASES',
      'OTHER',
    ])
    .optional(),
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value ? value === 'true' : undefined)),
});

export const createExpenseCategorySchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  type: z.enum([
    'RENT',
    'SERVICES',
    'MAINTENANCE',
    'CLEANING',
    'SALARIES',
    'SUPPLIES',
    'MARKETING',
    'TAXES',
    'REPAIRS',
    'PURCHASES',
    'OTHER',
  ]),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  parentId: z.string().cuid().optional(),
});

export const updateExpenseCategorySchema = createExpenseCategorySchema.partial();

export const expensesListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  branchId: z.string().cuid().optional(),
  categoryId: z.string().cuid().optional(),
  recordedById: z.string().cuid().optional(),
  status: z.enum(['RECORDED', 'CANCELLED']).optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  q: z.string().trim().optional(),
});

export const expenseSummaryQuerySchema = z.object({
  branchId: z.string().cuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const createExpenseSchema = z.object({
  branchId: z.string().cuid(),
  categoryId: z.string().cuid(),
  subcategory: z.string().optional(),
  description: z.string().min(3),
  amount: z.number().positive(),
  expenseDate: z.coerce.date(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'DEBIT_CARD', 'CREDIT_CARD', 'DIGITAL_WALLET', 'OTHER']),
  supplier: z.string().optional(),
  receiptUrl: z.string().url().optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringInterval: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  accountingTag: z.string().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();
