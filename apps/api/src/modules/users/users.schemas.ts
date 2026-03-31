import { z } from 'zod';

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().trim().optional(),
  roleCode: z.enum(['ADMIN', 'MANAGER', 'RECEPTIONIST', 'COLLECTIONS']).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value ? value === 'true' : undefined)),
});

export const createUserSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  roleCode: z.enum(['ADMIN', 'MANAGER', 'RECEPTIONIST', 'COLLECTIONS']),
  branchId: z.string().cuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateUserSchema = createUserSchema.partial().extend({
  password: z.string().min(8).optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().cuid(),
});
