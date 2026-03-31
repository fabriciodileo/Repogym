import { addDays, endOfDay, startOfDay } from '../../lib/date-utils.js';
import { prisma } from '../../lib/prisma.js';

export class ReportsRepository {
  clientsByStatus(branchId?: string, status?: string) {
    return prisma.client.findMany({
      where: {
        deletedAt: null,
        branchId,
        status: status as never,
      },
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
          },
          orderBy: { endsAt: 'desc' },
          take: 1,
          include: {
            plan: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
      take: 300,
    });
  }

  membershipsExpiring(branchId?: string, dateFrom?: Date, dateTo?: Date) {
    return prisma.clientMembership.findMany({
      where: {
        deletedAt: null,
        branchId,
        status: 'ACTIVE',
        endsAt: {
          gte: startOfDay(dateFrom ?? new Date()),
          lte: endOfDay(dateTo ?? addDays(new Date(), 7)),
        },
      },
      include: {
        client: true,
        plan: true,
        branch: true,
      },
      orderBy: { endsAt: 'asc' },
      take: 300,
    });
  }

  payments(branchId?: string, dateFrom?: Date, dateTo?: Date) {
    return prisma.payment.findMany({
      where: {
        branchId,
        status: 'REGISTERED',
        paidAt: {
          gte: dateFrom ? startOfDay(dateFrom) : undefined,
          lte: dateTo ? endOfDay(dateTo) : undefined,
        },
      },
      include: {
        branch: true,
        client: true,
        registeredBy: true,
      },
      orderBy: { paidAt: 'desc' },
      take: 500,
    });
  }

  expenses(branchId?: string, dateFrom?: Date, dateTo?: Date) {
    return prisma.expense.findMany({
      where: {
        deletedAt: null,
        branchId,
        status: 'RECORDED',
        expenseDate: {
          gte: dateFrom ? startOfDay(dateFrom) : undefined,
          lte: dateTo ? endOfDay(dateTo) : undefined,
        },
      },
      include: {
        branch: true,
        category: {
          include: {
            parent: true,
          },
        },
        recordedBy: true,
      },
      orderBy: { expenseDate: 'desc' },
      take: 500,
    });
  }

  accesses(branchId?: string, dateFrom?: Date, dateTo?: Date) {
    return prisma.accessLog.findMany({
      where: {
        branchId,
        attemptedAt: {
          gte: dateFrom ? startOfDay(dateFrom) : undefined,
          lte: dateTo ? endOfDay(dateTo) : undefined,
        },
      },
      include: {
        branch: true,
        client: true,
        device: true,
      },
      orderBy: { attemptedAt: 'desc' },
      take: 500,
    });
  }

  topPlans(branchId?: string, dateFrom?: Date, dateTo?: Date) {
    return prisma.clientMembership.groupBy({
      by: ['planId'],
      where: {
        branchId,
        deletedAt: null,
        createdAt: {
          gte: dateFrom ? startOfDay(dateFrom) : undefined,
          lte: dateTo ? endOfDay(dateTo) : undefined,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        agreedAmount: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 20,
    });
  }

  paymentMethods(branchId?: string, dateFrom?: Date, dateTo?: Date) {
    return prisma.payment.groupBy({
      by: ['method'],
      where: {
        branchId,
        status: 'REGISTERED',
        paidAt: {
          gte: dateFrom ? startOfDay(dateFrom) : undefined,
          lte: dateTo ? endOfDay(dateTo) : undefined,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        finalAmount: true,
      },
      orderBy: {
        _sum: {
          finalAmount: 'desc',
        },
      },
    });
  }

  classAttendance(branchId?: string, dateFrom?: Date, dateTo?: Date) {
    return prisma.classSchedule.findMany({
      where: {
        branchId,
        startsAt: {
          gte: dateFrom ? startOfDay(dateFrom) : undefined,
          lte: dateTo ? endOfDay(dateTo) : undefined,
        },
      },
      include: {
        branch: true,
        activity: true,
        instructor: true,
        enrollments: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { startsAt: 'desc' },
      take: 300,
    });
  }

  lowStock(branchId?: string) {
    return prisma.product.findMany({
      where: {
        deletedAt: null,
        branchId,
        status: 'ACTIVE',
      },
      include: {
        branch: true,
        category: true,
      },
      orderBy: [{ stock: 'asc' }, { name: 'asc' }],
      take: 300,
    });
  }
}

export const reportsRepository = new ReportsRepository();
