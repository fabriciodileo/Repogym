import type { Prisma, PrismaClient } from '@prisma/client';

import { endOfDay, startOfDay } from '../../lib/date-utils.js';
import { prisma } from '../../lib/prisma.js';

const buildExpenseWhere = (filters: {
  branchId?: string;
  categoryId?: string;
  recordedById?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: Date;
  dateTo?: Date;
  q?: string;
}): Prisma.ExpenseWhereInput => ({
  deletedAt: null,
  branchId: filters.branchId,
  categoryId: filters.categoryId,
  recordedById: filters.recordedById,
  status: filters.status as never,
  amount:
    filters.minAmount !== undefined || filters.maxAmount !== undefined
      ? {
          gte: filters.minAmount,
          lte: filters.maxAmount,
        }
      : undefined,
  expenseDate:
    filters.dateFrom || filters.dateTo
      ? {
          gte: filters.dateFrom ? startOfDay(filters.dateFrom) : undefined,
          lte: filters.dateTo ? endOfDay(filters.dateTo) : undefined,
        }
      : undefined,
  OR: filters.q
    ? [
        { description: { contains: filters.q, mode: 'insensitive' } },
        { supplier: { contains: filters.q, mode: 'insensitive' } },
        { notes: { contains: filters.q, mode: 'insensitive' } },
      ]
    : undefined,
});

export class ExpensesRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  list(filters: {
    branchId?: string;
    categoryId?: string;
    recordedById?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
    dateFrom?: Date;
    dateTo?: Date;
    q?: string;
    skip: number;
    take: number;
  }) {
    return this.db.expense.findMany({
      where: buildExpenseWhere(filters),
      skip: filters.skip,
      take: filters.take,
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        category: {
          include: {
            parent: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        recordedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  count(filters: {
    branchId?: string;
    categoryId?: string;
    recordedById?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
    dateFrom?: Date;
    dateTo?: Date;
    q?: string;
  }) {
    return this.db.expense.count({ where: buildExpenseWhere(filters) });
  }

  findById(id: string) {
    return this.db.expense.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        cashMovements: {
          include: {
            cashSession: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  listCategories(filters: { type?: string; includeInactive?: boolean }) {
    return this.db.expenseCategory.findMany({
      where: {
        deletedAt: null,
        type: filters.type as never,
        isActive: filters.includeInactive ? undefined : true,
      },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        children: {
          where: {
            deletedAt: null,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  findCategoryById(id: string) {
    return this.db.expenseCategory.findUnique({
      where: { id },
      include: {
        parent: true,
      },
    });
  }

  findCategoryByCode(code: string) {
    return this.db.expenseCategory.findUnique({ where: { code } });
  }

  async summaryByCategory(filters: { branchId?: string; dateFrom?: Date; dateTo?: Date }) {
    const grouped = await this.db.expense.groupBy({
      by: ['categoryId'],
      where: buildExpenseWhere({
        branchId: filters.branchId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        status: 'RECORDED',
      }),
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const categories = await this.db.expenseCategory.findMany({
      where: {
        id: { in: grouped.map((item) => item.categoryId) },
      },
      include: {
        parent: true,
      },
    });

    return grouped
      .map((item) => {
        const category = categories.find((entry) => entry.id === item.categoryId);
        return {
          categoryId: item.categoryId,
          categoryCode: category?.code ?? item.categoryId,
          categoryName: category?.name ?? 'Sin categoria',
          parentCategoryName: category?.parent?.name ?? null,
          totalAmount: Number(item._sum.amount ?? 0),
          count: item._count.id,
        };
      })
      .sort((left, right) => right.totalAmount - left.totalAmount);
  }
}

export const expensesRepository = new ExpensesRepository();
