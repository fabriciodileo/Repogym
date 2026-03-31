import { endOfMonth, startOfMonth } from '../../lib/date-utils.js';
import { prisma } from '../../lib/prisma.js';
import { financeRepository } from './finance.repository.js';

const sumCashSessionMovements = (openingAmount: number, movements: Array<{ type: string; amount: unknown }>) =>
  movements.reduce((total, movement) => {
    const amount = Number(movement.amount ?? 0);

    if (movement.type === 'INCOME') {
      return total + amount;
    }

    if (movement.type === 'EXPENSE') {
      return total - amount;
    }

    if (movement.type === 'ADJUSTMENT') {
      return total + amount;
    }

    return total;
  }, openingAmount);

export class FinanceService {
  async summary(input: { branchId?: string; dateFrom?: Date; dateTo?: Date }) {
    const dateFrom = input.dateFrom ?? startOfMonth(new Date());
    const dateTo = input.dateTo ?? endOfMonth(new Date());
    const periodDays = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    const compareTo = new Date(dateFrom);
    compareTo.setDate(compareTo.getDate() - 1);
    const compareFrom = new Date(compareTo);
    compareFrom.setDate(compareFrom.getDate() - (periodDays - 1));

    const [income, expenses, previousIncome, previousExpenses, incomeByMethod, expensesByCategory, byBranch, openCashSessions, overdueReceivables, categories] =
      await Promise.all([
        financeRepository.incomeSum({ branchId: input.branchId, dateFrom, dateTo }),
        financeRepository.expenseSum({ branchId: input.branchId, dateFrom, dateTo }),
        financeRepository.incomeSum({ branchId: input.branchId, dateFrom: compareFrom, dateTo: compareTo }),
        financeRepository.expenseSum({ branchId: input.branchId, dateFrom: compareFrom, dateTo: compareTo }),
        financeRepository.incomeByMethod({ branchId: input.branchId, dateFrom, dateTo }),
        financeRepository.expensesByCategory({ branchId: input.branchId, dateFrom, dateTo }),
        financeRepository.branchBreakdown({ dateFrom, dateTo }),
        financeRepository.listOpenCashSessions(input.branchId),
        financeRepository.overdueReceivablesCount(input.branchId),
        prisma.expenseCategory.findMany({
          where: {
            id: {
              in: (await financeRepository.expensesByCategory({ branchId: input.branchId, dateFrom, dateTo })).map((item) => item.categoryId),
            },
          },
          include: {
            parent: true,
          },
        }),
      ]);

    const totalIncome = Number(income._sum.finalAmount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);
    const previousIncomeValue = Number(previousIncome._sum.finalAmount ?? 0);
    const previousExpensesValue = Number(previousExpenses._sum.amount ?? 0);

    return {
      period: {
        dateFrom,
        dateTo,
        compareFrom,
        compareTo,
      },
      totals: {
        income: totalIncome,
        expenses: totalExpenses,
        net: totalIncome - totalExpenses,
        overdueReceivables,
      },
      comparison: {
        incomeDelta: previousIncomeValue === 0 ? 100 : Number((((totalIncome - previousIncomeValue) / previousIncomeValue) * 100).toFixed(2)),
        expensesDelta: previousExpensesValue === 0 ? 100 : Number((((totalExpenses - previousExpensesValue) / previousExpensesValue) * 100).toFixed(2)),
        netDelta:
          previousIncomeValue - previousExpensesValue === 0
            ? 100
            : Number(
                (((totalIncome - totalExpenses - (previousIncomeValue - previousExpensesValue)) /
                  (previousIncomeValue - previousExpensesValue)) * 100).toFixed(2),
              ),
      },
      breakdowns: {
        incomeByMethod: incomeByMethod.map((item) => ({
          method: item.method,
          count: item._count.id,
          totalAmount: Number(item._sum.finalAmount ?? 0),
        })),
        expensesByCategory: expensesByCategory.map((item) => {
          const category = categories.find((entry) => entry.id === item.categoryId);
          return {
            categoryId: item.categoryId,
            categoryName: category?.name ?? 'Sin categoria',
            parentCategoryName: category?.parent?.name ?? null,
            count: item._count.id,
            totalAmount: Number(item._sum.amount ?? 0),
          };
        }),
        byBranch: byBranch.filter((item) => !input.branchId || item.branchId === input.branchId),
        openCashSessions: openCashSessions.map((session) => ({
          id: session.id,
          branch: session.branch,
          openedAt: session.openedAt,
          expectedAmount: sumCashSessionMovements(Number(session.openingAmount), session.movements),
        })),
      },
    };
  }
}

export const financeService = new FinanceService();
