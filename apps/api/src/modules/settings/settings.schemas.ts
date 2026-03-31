import { z } from 'zod';

export const systemSettingSchema = z.object({
  group: z.string().min(1),
  key: z.string().min(1),
  value: z.unknown(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export const bulkUpsertSettingsSchema = z.object({
  items: z.array(systemSettingSchema).min(1),
});
