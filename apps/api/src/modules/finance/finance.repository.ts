import type { PrismaClient } from '@prisma/client';

import { endOfDay, startOfDay } from '../../lib/date-utils.js';
import { prisma } from '../../lib/prisma.js';

export class FinanceRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  incomeSum(filters: { branchId?: string; dateFrom: Date; dateTo: Date }) {
    return this.db.payment.aggregate({
      where: {
        branchId: filters.branchId,
        status: 'REGISTERED',
        paidAt: {
          gte: startOfDay(filters.dateFrom),
          lte: endOfDay(filters.dateTo),
        },
      },
      _sum: {
        finalAmount: true,
      },
    });
  }

  expenseSum(filters: { branchId?: string; dateFrom: Date; dateTo: Date }) {
    return this.db.expense.aggregate({
      where: {
        deletedAt: null,
        branchId: filters.branchId,
        status: 'RECORDED',
        expenseDate: {
          gte: startOfDay(filters.dateFrom),
          lte: endOfDay(filters.dateTo),
        },
      },
      _sum: {
        amount: true,
      },
    });
  }

  incomeByMethod(filters: { branchId?: string; dateFrom: Date; dateTo: Date }) {
    return this.db.payment.groupBy({
      by: ['method'],
      where: {
        branchId: filters.branchId,
        status: 'REGISTERED',
        paidAt: {
          gte: startOfDay(filters.dateFrom),
          lte: endOfDay(filters.dateTo),
        },
      },
      _sum: {
        finalAmount: true,
      },
      _count: {
        id: true,
      },
    });
  }

  expensesByCategory(filters: { branchId?: string; dateFrom: Date; dateTo: Date }) {
    return this.db.expense.groupBy({
      by: ['categoryId'],
      where: {
        deletedAt: null,
        branchId: filters.branchId,
        status: 'RECORDED',
        expenseDate: {
          gte: startOfDay(filters.dateFrom),
          lte: endOfDay(filters.dateTo),
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });
  }

  async branchBreakdown(filters: { dateFrom: Date; dateTo: Date }) {
    const [branches, incomes, expenses] = await Promise.all([
      this.db.branch.findMany({
        where: { deletedAt: null },
        select: { id: true, code: true, name: true },
      }),
      this.db.payment.groupBy({
        by: ['branchId'],
        where: {
          status: 'REGISTERED',
          paidAt: {
            gte: startOfDay(filters.dateFrom),
            lte: endOfDay(filters.dateTo),
          },
        },
        _sum: { finalAmount: true },
      }),
      this.db.expense.groupBy({
        by: ['branchId'],
        where: {
          deletedAt: null,
          status: 'RECORDED',
          expenseDate: {
            gte: startOfDay(filters.dateFrom),
            lte: endOfDay(filters.dateTo),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    return branches.map((branch) => {
      const income = Number(incomes.find((item) => item.branchId === branch.id)?._sum.finalAmount ?? 0);
      const expense = Number(expenses.find((item) => item.branchId === branch.id)?._sum.amount ?? 0);
      return {
        branchId: branch.id,
        branchCode: branch.code,
        branchName: branch.name,
        income,
        expense,
        net: income - expense,
      };
    });
  }

  listOpenCashSessions(branchId?: string) {
    return this.db.cashSession.findMany({
      where: {
        branchId,
        status: 'OPEN',
      },
      include: {
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        movements: true,
      },
      orderBy: { openedAt: 'asc' },
    });
  }

  overdueReceivablesCount(branchId?: string) {
    return this.db.receivable.count({
      where: {
        deletedAt: null,
        branchId,
        status: 'OVERDUE',
      },
    });
  }
}

export const financeRepository = new FinanceRepository();
