import { z } from 'zod';

export const notificationsListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  branchId: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  type: z
    .enum([
      'MEMBERSHIP_EXPIRING',
      'MEMBERSHIP_EXPIRED',
      'OVERDUE_DEBT',
      'STOCK_LOW',
      'ACCESS_DENIED',
      'CLASS_REMINDER',
      'CLASS_CANCELLED',
      'CASH_ALERT',
      'SYSTEM_ALERT',
    ])
    .optional(),
  channel: z.enum(['INTERNAL', 'EMAIL', 'WHATSAPP', 'SMS']).optional(),
  status: z.enum(['PENDING', 'SENT', 'FAILED', 'READ', 'CANCELLED']).optional(),
  q: z.string().trim().optional(),
});

export const createNotificationSchema = z.object({
  branchId: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  templateCode: z.string().optional(),
  type: z.enum([
    'MEMBERSHIP_EXPIRING',
    'MEMBERSHIP_EXPIRED',
    'OVERDUE_DEBT',
    'STOCK_LOW',
    'ACCESS_DENIED',
    'CLASS_REMINDER',
    'CLASS_CANCELLED',
    'CASH_ALERT',
    'SYSTEM_ALERT',
  ]),
  channel: z.enum(['INTERNAL', 'EMAIL', 'WHATSAPP', 'SMS']),
  title: z.string().min(3).optional(),
  body: z.string().min(3).optional(),
  scheduledAt: z.coerce.date().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
}).superRefine((value, ctx) => {
  if (!value.templateCode && (!value.title || !value.body)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Se requiere templateCode o bien title y body.',
      path: ['templateCode'],
    });
  }
});

export const notificationsProcessSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export const notificationsSyncSchema = z.object({
  branchId: z.string().cuid().optional(),
});

export const notificationIdParamSchema = z.object({
  id: z.string().cuid(),
});
