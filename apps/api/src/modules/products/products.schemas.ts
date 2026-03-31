import { z } from 'zod';

export const productIdParamSchema = z.object({ id: z.string().cuid() });
export const productCategoryIdParamSchema = z.object({ id: z.string().cuid() });

export const productsListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  branchId: z.string().cuid().optional(),
  categoryId: z.string().cuid().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED']).optional(),
  lowStockOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value ? value === 'true' : undefined)),
  q: z.string().trim().optional(),
});

export const stockMovementsListQuerySchema = z.object({
  productId: z.string().cuid().optional(),
  branchId: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const createProductCategorySchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateProductCategorySchema = createProductCategorySchema.partial();

export const createProductSchema = z.object({
  branchId: z.string().cuid().optional(),
  categoryId: z.string().cuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  description: z.string().optional(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0),
  costPrice: z.number().min(0),
  salePrice: z.number().nonnegative(),
  supplier: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED']).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createStockMovementSchema = z.object({
  productId: z.string().cuid(),
  branchId: z.string().cuid().optional(),
  type: z.enum(['PURCHASE', 'SALE', 'ADJUSTMENT', 'LOSS', 'RETURN', 'INITIAL']),
  quantity: z.number().int().refine((value) => value !== 0, 'La cantidad no puede ser cero.'),
  reason: z.string().optional(),
});

const saleItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().positive(),
});

export const createProductSaleSchema = z
  .object({
    branchId: z.string().cuid(),
    clientId: z.string().cuid().optional(),
    items: z.array(saleItemSchema).min(1),
    discountAmount: z.number().min(0).optional(),
    surchargeAmount: z.number().min(0).optional(),
    notes: z.string().optional(),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'DEBIT_CARD', 'CREDIT_CARD', 'DIGITAL_WALLET', 'OTHER']).optional(),
    paymentReference: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.paymentMethod && !value.clientId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Una venta sin pago inmediato requiere cliente para generar deuda.',
        path: ['clientId'],
      });
    }
  });
