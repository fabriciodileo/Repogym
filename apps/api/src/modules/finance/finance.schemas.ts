import { z } from 'zod';

export const financeSummaryQuerySchema = z.object({
  branchId: z.string().cuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
