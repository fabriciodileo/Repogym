import { z } from 'zod';

export const validateAccessSchema = z.object({
  branchId: z.string().cuid(),
  identifier: z.string().min(1),
  method: z.enum(['RFID', 'QR_CODE', 'DNI', 'MEMBER_NUMBER', 'MANUAL_OVERRIDE', 'API']),
  deviceCode: z.string().optional(),
  note: z.string().optional(),
});

export const accessLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  branchId: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  result: z.enum(['ALLOWED', 'DENIED']).optional(),
});
