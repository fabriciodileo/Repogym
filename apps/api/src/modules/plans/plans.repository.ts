import { PrismaClient } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';

export class PlansRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  list(activeOnly?: boolean) {
    return this.db.membershipPlan.findMany({
      where: {
        deletedAt: null,
        isActive: activeOnly ? true : undefined,
      },
      include: {
        branchLinks: {
          include: {
            branch: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        timeRules: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.db.membershipPlan.findFirst({
      where: { id, deletedAt: null },
      include: {
        branchLinks: true,
        timeRules: true,
      },
    });
  }

  findByCode(code: string) {
    return this.db.membershipPlan.findUnique({
      where: { code },
    });
  }
}

export const plansRepository = new PlansRepository();
