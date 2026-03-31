import { PrismaClient, type ClientStatus, type Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';

const buildWhere = (filters: { q?: string; branchId?: string; status?: ClientStatus }): Prisma.ClientWhereInput => ({
  deletedAt: null,
  branchId: filters.branchId,
  status: filters.status,
  OR: filters.q
    ? [
        { firstName: { contains: filters.q, mode: 'insensitive' } },
        { lastName: { contains: filters.q, mode: 'insensitive' } },
        { dni: { contains: filters.q, mode: 'insensitive' } },
        { memberNumber: { contains: filters.q, mode: 'insensitive' } },
        { email: { contains: filters.q, mode: 'insensitive' } },
      ]
    : undefined,
});

export class ClientsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  list(filters: { q?: string; branchId?: string; status?: ClientStatus; skip: number; take: number }) {
    return this.db.client.findMany({
      where: buildWhere(filters),
      skip: filters.skip,
      take: filters.take,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        memberships: {
          where: {
            deletedAt: null,
            status: {
              in: ['ACTIVE', 'PENDING', 'FROZEN', 'PAUSED'],
            },
          },
          orderBy: { endsAt: 'desc' },
          take: 1,
          include: {
            plan: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        receivables: {
          where: {
            status: {
              in: ['OPEN', 'PARTIAL', 'OVERDUE'],
            },
            deletedAt: null,
          },
          select: {
            id: true,
          },
        },
      },
    });
  }

  count(filters: { q?: string; branchId?: string; status?: ClientStatus }) {
    return this.db.client.count({ where: buildWhere(filters) });
  }

  findById(id: string) {
    return this.db.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        accessCredentials: true,
      },
    });
  }

  findByDni(dni: string) {
    return this.db.client.findUnique({
      where: { dni },
    });
  }

  findByMemberNumber(memberNumber: string) {
    return this.db.client.findUnique({
      where: { memberNumber },
    });
  }

  findProfile(id: string) {
    return this.db.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        branch: true,
        accessCredentials: true,
        memberships: {
          where: { deletedAt: null },
          orderBy: { startsAt: 'desc' },
          include: {
            plan: true,
            branch: true,
          },
        },
        payments: {
          orderBy: { paidAt: 'desc' },
          take: 20,
          include: {
            allocations: true,
          },
        },
        receivables: {
          where: { deletedAt: null },
          orderBy: { dueDate: 'desc' },
        },
        accessLogs: {
          orderBy: { attemptedAt: 'desc' },
          take: 30,
          include: {
            device: true,
            membership: {
              include: {
                plan: true,
              },
            },
          },
        },
        incidents: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }
}

export const clientsRepository = new ClientsRepository();
