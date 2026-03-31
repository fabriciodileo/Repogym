import { PrismaClient, type AccessMethod, type AccessResult, type Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';

const buildLogWhere = (filters: {
  branchId?: string;
  clientId?: string;
  result?: AccessResult;
}): Prisma.AccessLogWhereInput => ({
  branchId: filters.branchId,
  clientId: filters.clientId,
  result: filters.result,
});

export class AccessControlRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findDeviceByCode(code: string) {
    return this.db.accessDevice.findUnique({
      where: { code },
    });
  }

  findClientByIdentifier(method: AccessMethod, identifier: string) {
    if (method === 'DNI') {
      return this.db.client.findFirst({
        where: {
          dni: identifier,
          deletedAt: null,
        },
      });
    }

    if (method === 'MEMBER_NUMBER') {
      return this.db.client.findFirst({
        where: {
          memberNumber: identifier,
          deletedAt: null,
        },
      });
    }

    return this.db.client.findFirst({
      where: {
        deletedAt: null,
        accessCredentials: {
          some: {
            value: identifier,
            isActive: true,
          },
        },
      },
      include: {
        accessCredentials: {
          where: {
            value: identifier,
            isActive: true,
          },
        },
      },
    });
  }

  findActiveMemberships(clientId: string) {
    return this.db.clientMembership.findMany({
      where: {
        clientId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        plan: {
          include: {
            branchLinks: true,
            timeRules: true,
          },
        },
      },
      orderBy: { endsAt: 'asc' },
    });
  }

  findOverdueDebt(clientId: string) {
    return this.db.receivable.findFirst({
      where: {
        clientId,
        deletedAt: null,
        status: 'OVERDUE',
      },
    });
  }

  listLogs(filters: { branchId?: string; clientId?: string; result?: AccessResult; skip: number; take: number }) {
    return this.db.accessLog.findMany({
      where: buildLogWhere(filters),
      skip: filters.skip,
      take: filters.take,
      orderBy: { attemptedAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        device: true,
        membership: {
          include: {
            plan: true,
          },
        },
      },
    });
  }

  countLogs(filters: { branchId?: string; clientId?: string; result?: AccessResult }) {
    return this.db.accessLog.count({ where: buildLogWhere(filters) });
  }
}

export const accessControlRepository = new AccessControlRepository();
