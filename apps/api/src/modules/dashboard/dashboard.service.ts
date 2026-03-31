import { addDays, startOfDay, startOfMonth } from '../../lib/date-utils.js';
import { prisma } from '../../lib/prisma.js';

export class DashboardService {
  async overview(branchId?: string) {
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());
    const previousMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
    const weekAhead = addDays(today, 7);
    const next24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [
      activeClients,
      overdueReceivables,
      overdueClientsRows,
      expiringMemberships,
      todayAccesses,
      dayIncome,
      monthIncome,
      previousMonthIncome,
      todayExpenses,
      monthExpenses,
      recentAccesses,
      upcomingExpirations,
      lowStockCandidates,
      openCashSessions,
      upcomingClasses,
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
      prisma.receivable.findMany({
        where: {
          deletedAt: null,
          branchId,
          status: 'OVERDUE',
        },
        select: {
          clientId: true,
        },
        distinct: ['clientId'],
      }),
      prisma.clientMembership.count({
        where: {
          deletedAt: null,
          branchId,
          status: 'ACTIVE',
          endsAt: {
            gte: today,
            lte: weekAhead,
          },
        },
      }),
      prisma.accessLog.count({
        where: {
          branchId,
          attemptedAt: {
            gte: today,
          },
          result: 'ALLOWED',
        },
      }),
      prisma.payment.aggregate({
        where: {
          branchId,
          status: 'REGISTERED',
          paidAt: { gte: today },
        },
        _sum: { finalAmount: true },
      }),
      prisma.payment.aggregate({
        where: {
          branchId,
          status: 'REGISTERED',
          paidAt: { gte: monthStart },
        },
        _sum: { finalAmount: true },
      }),
      prisma.payment.aggregate({
        where: {
          branchId,
          status: 'REGISTERED',
          paidAt: {
            gte: previousMonthStart,
            lt: monthStart,
          },
        },
        _sum: { finalAmount: true },
      }),
      prisma.expense.aggregate({
        where: {
          branchId,
          deletedAt: null,
          status: 'RECORDED',
          expenseDate: { gte: today },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          branchId,
          deletedAt: null,
          status: 'RECORDED',
          expenseDate: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      prisma.accessLog.findMany({
        where: { branchId },
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
      prisma.clientMembership.findMany({
        where: {
          deletedAt: null,
          branchId,
          status: 'ACTIVE',
          endsAt: {
            gte: today,
            lte: weekAhead,
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
      prisma.product.findMany({
        where: {
          deletedAt: null,
          branchId,
          status: 'ACTIVE',
        },
        include: {
          branch: true,
          category: true,
        },
      }),
      prisma.cashSession.findMany({
        where: {
          branchId,
          status: 'OPEN',
        },
        include: {
          branch: true,
          movements: true,
        },
        orderBy: { openedAt: 'asc' },
      }),
      prisma.classSchedule.findMany({
        where: {
          branchId,
          status: 'SCHEDULED',
          startsAt: {
            gte: today,
            lte: next24Hours,
          },
        },
        include: {
          activity: true,
          branch: true,
          instructor: true,
          enrollments: true,
        },
        orderBy: { startsAt: 'asc' },
        take: 6,
      }),
    ]);

    const monthIncomeValue = Number(monthIncome._sum.finalAmount ?? 0);
    const previousMonthIncomeValue = Number(previousMonthIncome._sum.finalAmount ?? 0);
    const monthExpensesValue = Number(monthExpenses._sum.amount ?? 0);
    const todayIncomeValue = Number(dayIncome._sum.finalAmount ?? 0);
    const todayExpensesValue = Number(todayExpenses._sum.amount ?? 0);
    const lowStockProducts = lowStockCandidates.filter((product) => product.stock <= product.minStock);

    return {
      indicators: {
        activeClients,
        overdueReceivables,
        overdueClients: overdueClientsRows.length,
        expiringMemberships,
        todayAccesses,
        dayIncome: todayIncomeValue,
        monthIncome: monthIncomeValue,
        todayExpenses: todayExpensesValue,
        monthExpenses: monthExpensesValue,
        netBalance: monthIncomeValue - monthExpensesValue,
        dayNetBalance: todayIncomeValue - todayExpensesValue,
        monthIncomeDelta:
          previousMonthIncomeValue === 0
            ? 100
            : Number((((monthIncomeValue - previousMonthIncomeValue) / previousMonthIncomeValue) * 100).toFixed(2)),
        openCashSessions: openCashSessions.length,
        lowStockProducts: lowStockProducts.length,
        upcomingClasses: upcomingClasses.length,
      },
      upcomingExpirations,
      recentAccesses,
      lowStockProducts: lowStockProducts.slice(0, 6),
      openCashSessions: openCashSessions.map((session) => ({
        id: session.id,
        branch: session.branch,
        openedAt: session.openedAt,
        expectedAmount: session.movements.reduce((total, movement) => {
          const amount = Number(movement.amount ?? 0);
          if (movement.type === 'INCOME') return total + amount;
          if (movement.type === 'EXPENSE') return total - amount;
          if (movement.type === 'ADJUSTMENT') return total + amount;
          return total;
        }, Number(session.openingAmount)),
      })),
      upcomingClasses: upcomingClasses.map((schedule) => ({
        id: schedule.id,
        startsAt: schedule.startsAt,
        room: schedule.room,
        branch: schedule.branch,
        instructor: schedule.instructor,
        activity: {
          id: schedule.activity.id,
          name: schedule.activity.name,
        },
        enrolledCount: schedule.enrollments.filter((item) => ['ENROLLED', 'ATTENDED'].includes(item.status)).length,
        capacity: schedule.capacityOverride ?? schedule.activity.capacity,
      })),
      topPlans: await prisma.clientMembership.groupBy({
        by: ['planId'],
        where: {
          branchId,
          deletedAt: null,
        },
        _count: { planId: true },
        orderBy: {
          _count: { planId: 'desc' },
        },
        take: 5,
      }),
    };
  }
}

export const dashboardService = new DashboardService();
