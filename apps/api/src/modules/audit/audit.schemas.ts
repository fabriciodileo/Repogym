import { z } from 'zod';

export const auditListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});
