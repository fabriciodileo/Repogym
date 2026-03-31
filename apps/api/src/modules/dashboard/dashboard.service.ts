import { prisma } from '../../lib/prisma.js';

export class DashboardService {
  async overview(branchId?: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
    const previousMonthStart = new Date(startOfDay.getFullYear(), startOfDay.getMonth() - 1, 1);

    const [
      activeClients,
      overdueReceivables,
      expiringMemberships,
      todayAccesses,
      dayIncome,
      monthIncome,
      previousMonthIncome,
      todayExpenses,
      monthExpenses,
    ] = await Promise.all([
      prisma.client.count({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
          branchId,
        },
      }),
      prisma.receivable.count({
        where: {
          deletedAt: null,
          branchId,
          status: 'OVERDUE',
        },
      }),
      prisma.clientMembership.count({
        where: {
          deletedAt: null,
          branchId,
          status: 'ACTIVE',
          endsAt: {
            gte: startOfDay,
            lte: new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.accessLog.count({
        where: {
          branchId,
          attemptedAt: {
            gte: startOfDay,
          },
          result: 'ALLOWED',
        },
      }),
      prisma.payment.aggregate({
        where: {
          branchId,
          status: 'REGISTERED',
          paidAt: {
            gte: startOfDay,
          },
        },
        _sum: { finalAmount: true },
      }),
      prisma.payment.aggregate({
        where: {
          branchId,
          status: 'REGISTERED',
          paidAt: {
            gte: startOfMonth,
          },
        },
        _sum: { finalAmount: true },
      }),
      prisma.payment.aggregate({
        where: {
          branchId,
          status: 'REGISTERED',
          paidAt: {
            gte: previousMonthStart,
            lt: startOfMonth,
          },
        },
        _sum: { finalAmount: true },
      }),
      prisma.expense.aggregate({
        where: {
          branchId,
          deletedAt: null,
          status: 'RECORDED',
          expenseDate: {
            gte: startOfDay,
          },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          branchId,
          deletedAt: null,
          status: 'RECORDED',
          expenseDate: {
            gte: startOfMonth,
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const monthIncomeValue = Number(monthIncome._sum.finalAmount ?? 0);
    const previousMonthIncomeValue = Number(previousMonthIncome._sum.finalAmount ?? 0);

    return {
      indicators: {
        activeClients,
        overdueReceivables,
        expiringMemberships,
        todayAccesses,
        dayIncome: Number(dayIncome._sum.finalAmount ?? 0),
        monthIncome: monthIncomeValue,
        todayExpenses: Number(todayExpenses._sum.amount ?? 0),
        monthExpenses: Number(monthExpenses._sum.amount ?? 0),
        netBalance:
          monthIncomeValue - Number(monthExpenses._sum.amount ?? 0),
        monthIncomeDelta:
          previousMonthIncomeValue === 0
            ? 100
            : Number(
                (((monthIncomeValue - previousMonthIncomeValue) / previousMonthIncomeValue) * 100).toFixed(2),
              ),
      },
      upcomingExpirations: await prisma.clientMembership.findMany({
        where: {
          deletedAt: null,
          branchId,
          status: 'ACTIVE',
          endsAt: {
            gte: startOfDay,
            lte: new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              memberNumber: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { endsAt: 'asc' },
        take: 8,
      }),
      recentAccesses: await prisma.accessLog.findMany({
        where: {
          branchId,
        },
        orderBy: { attemptedAt: 'desc' },
        take: 12,
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
              memberNumber: true,
            },
          },
        },
      }),
      topPlans: await prisma.clientMembership.groupBy({
        by: ['planId'],
        where: {
          branchId,
          deletedAt: null,
        },
        _count: {
          planId: true,
        },
        orderBy: {
          _count: {
            planId: 'desc',
          },
        },
        take: 5,
      }),
    };
  }
}

export const dashboardService = new DashboardService();

