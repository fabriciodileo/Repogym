import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';

export class SettingsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  list() {
    return this.db.systemSetting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });
  }

  upsert(
    data: Prisma.SystemSettingUncheckedCreateInput & Prisma.SystemSettingUncheckedUpdateInput,
  ) {
    return this.db.systemSetting.upsert({
      where: {
        group_key: {
          group: data.group,
          key: data.key,
        },
      },
      create: data,
      update: data,
    });
  }
}

export const settingsRepository = new SettingsRepository();
