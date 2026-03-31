import type { Prisma, PrismaClient, SystemSetting } from '@prisma/client';

import { auditService } from '../audit/audit.service.js';
import { settingsRepository } from './settings.repository.js';

export const reserveFormattedSequence = async (
  tx: Prisma.TransactionClient,
  input: {
    group: string;
    key: string;
    prefix?: string;
    padLength?: number;
    updatedById?: string;
  },
) => {
  const existing = await tx.systemSetting.findUnique({
    where: {
      group_key: {
        group: input.group,
        key: input.key,
      },
    },
  });

  const currentValue = Number((existing?.value as { next?: number } | null)?.next ?? 1);
  const nextValue = currentValue + 1;

  await tx.systemSetting.upsert({
    where: {
      group_key: {
        group: input.group,
        key: input.key,
      },
    },
    create: {
      group: input.group,
      key: input.key,
      value: { next: nextValue },
      updatedById: input.updatedById,
    },
    update: {
      value: { next: nextValue },
      updatedById: input.updatedById,
    },
  });

  const prefix = input.prefix ?? '';
  const sequence = String(currentValue).padStart(input.padLength ?? 6, '0');
  return `${prefix}${sequence}`;
};

export class SettingsService {
  list() {
    return settingsRepository.list();
  }

  async bulkUpsert(
    items: Array<{
      group: string;
      key: string;
      value: unknown;
      description?: string;
      isPublic?: boolean;
    }>,
    actor: { userId: string; branchId?: string | null },
  ) {
    const results = [] as SystemSetting[];

    for (const item of items) {
      const result = await settingsRepository.upsert({
        group: item.group,
        key: item.key,
        value: item.value as Prisma.InputJsonValue,
        description: item.description,
        isPublic: item.isPublic ?? false,
        updatedById: actor.userId,
      });
      results.push(result);
    }

    await auditService.record({
      userId: actor.userId,
      branchId: actor.branchId,
      action: 'SETTINGS_UPDATED',
      entityName: 'SystemSetting',
      description: 'Actualizacion de configuracion general',
      metadata: items.map((item) => `${item.group}.${item.key}`),
    });

    return results;
  }
}

export const settingsService = new SettingsService();
