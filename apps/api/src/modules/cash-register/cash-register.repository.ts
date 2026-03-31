import type { PrismaClient } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';

export class CashRegisterRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  listSessions(filters: { branchId?: string; status?: string; skip: number; take: number }) {
    return this.db.cashSession.findMany({
      where: {
        branchId: filters.branchId,
        status: filters.status as never,
      },
      skip: filters.skip,
      take: filters.take,
      orderBy: [{ status: 'asc' }, { openedAt: 'desc' }],
      include: {
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        openedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        closedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        movements: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  countSessions(filters: { branchId?: string; status?: string }) {
    return this.db.cashSession.count({
      where: {
        branchId: filters.branchId,
        status: filters.status as never,
      },
    });
  }

  findOpenSessionByBranch(branchId: string) {
    return this.db.cashSession.findFirst({
      where: {
        branchId,
        status: 'OPEN',
      },
      include: {
        branch: true,
        openedBy: true,
        movements: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  findSessionById(id: string) {
    return this.db.cashSession.findUnique({
      where: { id },
      include: {
        branch: true,
        openedBy: true,
        closedBy: true,
        movements: {
          include: {
            payment: true,
            expense: true,
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }
}

export const cashRegisterRepository = new CashRegisterRepository();
