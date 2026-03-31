import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';

const buildWhere = (filters: {
  branchId?: string;
  clientId?: string;
  userId?: string;
  type?: string;
  channel?: string;
  status?: string;
  q?: string;
}): Prisma.NotificationWhereInput => ({
  branchId: filters.branchId,
  clientId: filters.clientId,
  userId: filters.userId,
  type: filters.type as Prisma.EnumNotificationTypeFilter | undefined,
  channel: filters.channel as Prisma.EnumNotificationChannelFilter | undefined,
  status: filters.status as Prisma.EnumNotificationStatusFilter | undefined,
  OR: filters.q
    ? [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { body: { contains: filters.q, mode: 'insensitive' } },
      ]
    : undefined,
});

export class NotificationsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  list(filters: {
    branchId?: string;
    clientId?: string;
    userId?: string;
    type?: string;
    channel?: string;
    status?: string;
    q?: string;
    skip: number;
    take: number;
  }) {
    return this.db.notification.findMany({
      where: buildWhere(filters),
      skip: filters.skip,
      take: filters.take,
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            memberNumber: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        template: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  count(filters: {
    branchId?: string;
    clientId?: string;
    userId?: string;
    type?: string;
    channel?: string;
    status?: string;
    q?: string;
  }) {
    return this.db.notification.count({ where: buildWhere(filters) });
  }

  findById(id: string) {
    return this.db.notification.findUnique({
      where: { id },
      include: {
        branch: true,
        client: true,
        user: true,
        template: true,
      },
    });
  }

  findPending(limit: number) {
    return this.db.notification.findMany({
      where: {
        status: 'PENDING',
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });
  }

  findTemplateByCode(code: string) {
    return this.db.notificationTemplate.findUnique({ where: { code } });
  }

  findRecentSimilar(filters: {
    type: string;
    branchId?: string | null;
    clientId?: string | null;
    userId?: string | null;
    title: string;
    createdAfter: Date;
  }) {
    return this.db.notification.findFirst({
      where: {
        type: filters.type as Prisma.EnumNotificationTypeFilter,
        branchId: filters.branchId ?? undefined,
        clientId: filters.clientId ?? undefined,
        userId: filters.userId ?? undefined,
        title: filters.title,
        createdAt: { gte: filters.createdAfter },
        status: { in: ['PENDING', 'SENT', 'READ'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const notificationsRepository = new NotificationsRepository();
