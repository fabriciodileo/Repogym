import type { PrismaClient} from '@prisma/client';
import { type MembershipStatus, type Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';

const buildWhere = (filters: {
  clientId?: string;
  branchId?: string;
  status?: MembershipStatus;
}): Prisma.ClientMembershipWhereInput => ({
  deletedAt: null,
  clientId: filters.clientId,
  branchId: filters.branchId,
  status: filters.status,
});

export class MembershipsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  list(filters: {
    clientId?: string;
    branchId?: string;
    status?: MembershipStatus;
    skip: number;
    take: number;
  }) {
    return this.db.clientMembership.findMany({
      where: buildWhere(filters),
      skip: filters.skip,
      take: filters.take,
      orderBy: { startsAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        plan: true,
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        receivables: true,
      },
    });
  }

  count(filters: { clientId?: string; branchId?: string; status?: MembershipStatus }) {
    return this.db.clientMembership.count({ where: buildWhere(filters) });
  }

  findById(id: string) {
    return this.db.clientMembership.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: true,
        plan: {
          include: {
            branchLinks: true,
            timeRules: true,
          },
        },
        branch: true,
        receivables: true,
      },
    });
  }

  findPlanById(id: string) {
    return this.db.membershipPlan.findFirst({
      where: { id, deletedAt: null, isActive: true },
      include: {
        branchLinks: true,
        timeRules: true,
      },
    });
  }

  findClientById(id: string) {
    return this.db.client.findFirst({
      where: { id, deletedAt: null },
    });
  }
}

export const membershipsRepository = new MembershipsRepository();
