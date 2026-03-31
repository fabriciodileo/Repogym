import { Prisma } from '@prisma/client';

import { AppError } from '../../core/errors/app-error.js';
import { normalizePageParams } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import { auditService } from '../audit/audit.service.js';
import { expensesRepository } from './expenses.repository.js';

type Actor = {
  userId: string;
  branchId?: string | null;
};

type ExpenseCategoryInput = {
  code?: string;
  name?: string;
  type?:
    | 'RENT'
    | 'SERVICES'
    | 'MAINTENANCE'
    | 'CLEANING'
    | 'SALARIES'
    | 'SUPPLIES'
    | 'MARKETING'
    | 'TAXES'
    | 'REPAIRS'
    | 'PURCHASES'
    | 'OTHER';
  description?: string;
  isActive?: boolean;
  parentId?: string;
};

type ExpenseInput = {
  branchId?: string;
  categoryId?: string;
  subcategory?: string;
  description?: string;
  amount?: number;
  expenseDate?: Date;
  method?: 'CASH' | 'BANK_TRANSFER' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'DIGITAL_WALLET' | 'OTHER';
  supplier?: string;
  receiptUrl?: string;
  notes?: string;
  isRecurring?: boolean;
  recurringInterval?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  accountingTag?: string;
};

export class ExpensesService {
  async list(input: {
    page?: number;
    pageSize?: number;
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
    const pagination = normalizePageParams(input.page, input.pageSize);
    const [items, total, summary] = await Promise.all([
      expensesRepository.list({ ...input, skip: pagination.skip, take: pagination.take }),
      expensesRepository.count(input),
      expensesRepository.summaryByCategory(input),
    ]);

    return {
      data: items,
      summary,
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
    };
  }

  listCategories(input: { type?: string; includeInactive?: boolean }) {
    return expensesRepository.listCategories(input);
  }

  summary(input: { branchId?: string; dateFrom?: Date; dateTo?: Date }) {
    return expensesRepository.summaryByCategory(input);
  }

  async createCategory(input: ExpenseCategoryInput, actor: Actor) {
    const duplicate = await expensesRepository.findCategoryByCode(input.code!);
    if (duplicate && !duplicate.deletedAt) {
      throw new AppError('Ya existe una categoria de gasto con ese codigo.', 409, 'EXPENSE_CATEGORY_EXISTS');
    }

    if (input.parentId) {
      const parent = await expensesRepository.findCategoryById(input.parentId);
      if (!parent || parent.deletedAt) {
        throw new AppError('La categoria padre no existe.', 404, 'EXPENSE_CATEGORY_PARENT_NOT_FOUND');
      }
    }

    const category = await prisma.expenseCategory.create({
      data: {
        code: input.code!,
        name: input.name!,
        type: input.type!,
        description: input.description,
        isActive: input.isActive ?? true,
        parentId: input.parentId,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: actor.branchId,
      action: 'CREATE',
      entityName: 'ExpenseCategory',
      entityId: category.id,
      description: 'Alta de categoria de gasto',
      metadata: {
        code: category.code,
        type: category.type,
      },
    });

    return category;
  }

  async updateCategory(id: string, input: ExpenseCategoryInput, actor: Actor) {
    const existing = await expensesRepository.findCategoryById(id);
    if (!existing || existing.deletedAt) {
      throw new AppError('Categoria de gasto no encontrada.', 404, 'EXPENSE_CATEGORY_NOT_FOUND');
    }

    if (input.code && input.code !== existing.code) {
      const duplicate = await expensesRepository.findCategoryByCode(input.code);
      if (duplicate && duplicate.id !== id && !duplicate.deletedAt) {
        throw new AppError('Ya existe una categoria de gasto con ese codigo.', 409, 'EXPENSE_CATEGORY_EXISTS');
      }
    }

    if (input.parentId) {
      if (input.parentId === id) {
        throw new AppError('Una categoria no puede ser su propio padre.', 400, 'EXPENSE_CATEGORY_PARENT_INVALID');
      }

      const parent = await expensesRepository.findCategoryById(input.parentId);
      if (!parent || parent.deletedAt) {
        throw new AppError('La categoria padre no existe.', 404, 'EXPENSE_CATEGORY_PARENT_NOT_FOUND');
      }
    }

    const category = await prisma.expenseCategory.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        type: input.type,
        description: input.description,
        isActive: input.isActive,
        parentId: input.parentId,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: actor.branchId,
      action: 'UPDATE',
      entityName: 'ExpenseCategory',
      entityId: category.id,
      description: 'Actualizacion de categoria de gasto',
    });

    return category;
  }

  async create(input: ExpenseInput, actor: Actor) {
    const branch = await prisma.branch.findFirst({ where: { id: input.branchId, deletedAt: null } });
    if (!branch) {
      throw new AppError('Sucursal no encontrada.', 404, 'BRANCH_NOT_FOUND');
    }

    const category = await expensesRepository.findCategoryById(input.categoryId!);
    if (!category || category.deletedAt || !category.isActive) {
      throw new AppError('Categoria de gasto no encontrada o inactiva.', 404, 'EXPENSE_CATEGORY_NOT_FOUND');
    }

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          branchId: input.branchId!,
          categoryId: input.categoryId!,
          subcategory: input.subcategory,
          description: input.description!,
          amount: new Prisma.Decimal(input.amount!),
          expenseDate: input.expenseDate!,
          method: input.method!,
          supplier: input.supplier,
          receiptUrl: input.receiptUrl,
          recordedById: actor.userId,
          notes: input.notes,
          isRecurring: input.isRecurring ?? false,
          recurringInterval: input.recurringInterval,
          accountingTag: input.accountingTag,
        },
      });

      if (input.method === 'CASH') {
        const openSession = await tx.cashSession.findFirst({
          where: {
            branchId: input.branchId,
            status: 'OPEN',
          },
          orderBy: { openedAt: 'desc' },
        });

        if (openSession) {
          await tx.cashMovement.create({
            data: {
              cashSessionId: openSession.id,
              branchId: input.branchId!,
              expenseId: created.id,
              type: 'EXPENSE',
              amount: new Prisma.Decimal(input.amount!),
              method: 'CASH',
              description: input.description!,
              reference: input.receiptUrl,
              metadata: {
                categoryId: input.categoryId,
              } as Prisma.InputJsonValue,
              createdById: actor.userId,
            },
          });
        }
      }

      return tx.expense.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          branch: true,
          category: {
            include: {
              parent: true,
            },
          },
          recordedBy: true,
          cashMovements: true,
        },
      });
    });

    await auditService.record({
      userId: actor.userId,
      branchId: expense.branchId,
      action: 'EXPENSE_RECORDED',
      entityName: 'Expense',
      entityId: expense.id,
      description: 'Registro de gasto operativo',
      metadata: {
        amount: expense.amount,
        method: expense.method,
      },
    });

    return expense;
  }

  async update(id: string, input: ExpenseInput, actor: Actor) {
    const existing = await expensesRepository.findById(id);
    if (!existing || existing.deletedAt) {
      throw new AppError('Gasto no encontrado.', 404, 'EXPENSE_NOT_FOUND');
    }

    const baseCashMovement = existing.cashMovements.find((movement) => movement.type === 'EXPENSE');
    const closedCashSession = existing.cashMovements.find((movement) => movement.cashSession.status === 'CLOSED');

    if (closedCashSession) {
      const amountChanged = input.amount !== undefined && Number(existing.amount) !== input.amount;
      const methodChanged = input.method !== undefined && existing.method !== input.method;
      const branchChanged = input.branchId !== undefined && existing.branchId !== input.branchId;

      if (amountChanged || methodChanged || branchChanged) {
        throw new AppError(
          'No se puede modificar monto, medio o sucursal de un gasto que ya impacto en una caja cerrada.',
          409,
          'EXPENSE_LOCKED_BY_CASH_SESSION',
        );
      }
    }

    const categoryId = input.categoryId ?? existing.categoryId;
    const category = await expensesRepository.findCategoryById(categoryId);
    if (!category || category.deletedAt || !category.isActive) {
      throw new AppError('Categoria de gasto no encontrada o inactiva.', 404, 'EXPENSE_CATEGORY_NOT_FOUND');
    }

    const nextMethod = input.method ?? existing.method;
    const nextAmount = input.amount ?? Number(existing.amount);
    const nextBranchId = input.branchId ?? existing.branchId;

    const expense = await prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id },
        data: {
          branchId: input.branchId,
          categoryId: input.categoryId,
          subcategory: input.subcategory,
          description: input.description,
          amount: input.amount !== undefined ? new Prisma.Decimal(input.amount) : undefined,
          expenseDate: input.expenseDate,
          method: input.method,
          supplier: input.supplier,
          receiptUrl: input.receiptUrl,
          notes: input.notes,
          isRecurring: input.isRecurring,
          recurringInterval: input.recurringInterval,
          accountingTag: input.accountingTag,
        },
      });

      if (baseCashMovement && baseCashMovement.cashSession.status === 'OPEN') {
        if (existing.method === 'CASH' && nextMethod === 'CASH') {
          await tx.cashMovement.update({
            where: { id: baseCashMovement.id },
            data: {
              amount: new Prisma.Decimal(nextAmount),
              description: input.description ?? existing.description,
              reference: input.receiptUrl ?? existing.receiptUrl,
              metadata: {
                categoryId,
              } as Prisma.InputJsonValue,
            },
          });
        }

        if (existing.method === 'CASH' && nextMethod !== 'CASH') {
          await tx.cashMovement.create({
            data: {
              cashSessionId: baseCashMovement.cashSessionId,
              branchId: existing.branchId,
              expenseId: existing.id,
              type: 'ADJUSTMENT',
              amount: new Prisma.Decimal(Number(existing.amount)),
              method: 'CASH',
              description: `Reversion de gasto ${existing.description} por cambio de metodo`,
              createdById: actor.userId,
            },
          });
        }
      }

      if (!baseCashMovement && existing.method !== 'CASH' && nextMethod === 'CASH') {
        const openSession = await tx.cashSession.findFirst({
          where: {
            branchId: nextBranchId,
            status: 'OPEN',
          },
          orderBy: { openedAt: 'desc' },
        });

        if (openSession) {
          await tx.cashMovement.create({
            data: {
              cashSessionId: openSession.id,
              branchId: nextBranchId,
              expenseId: existing.id,
              type: 'EXPENSE',
              amount: new Prisma.Decimal(nextAmount),
              method: 'CASH',
              description: input.description ?? existing.description,
              reference: input.receiptUrl ?? existing.receiptUrl,
              metadata: {
                categoryId,
              } as Prisma.InputJsonValue,
              createdById: actor.userId,
            },
          });
        }
      }

      return tx.expense.findUniqueOrThrow({
        where: { id: updated.id },
        include: {
          branch: true,
          category: {
            include: {
              parent: true,
            },
          },
          recordedBy: true,
        },
      });
    });

    await auditService.record({
      userId: actor.userId,
      branchId: expense.branchId,
      action: 'UPDATE',
      entityName: 'Expense',
      entityId: expense.id,
      description: 'Actualizacion de gasto operativo',
    });

    return expense;
  }

  async remove(id: string, actor: Actor) {
    const existing = await expensesRepository.findById(id);
    if (!existing || existing.deletedAt) {
      throw new AppError('Gasto no encontrado.', 404, 'EXPENSE_NOT_FOUND');
    }

    const closedCashSession = existing.cashMovements.find((movement) => movement.cashSession.status === 'CLOSED');
    if (closedCashSession) {
      throw new AppError(
        'No se puede anular un gasto que ya impacto en una caja cerrada.',
        409,
        'EXPENSE_LOCKED_BY_CASH_SESSION',
      );
    }

    const expense = await prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          deletedAt: new Date(),
        },
      });

      const baseCashMovement = existing.cashMovements.find((movement) => movement.type === 'EXPENSE');
      if (baseCashMovement && baseCashMovement.cashSession.status === 'OPEN') {
        await tx.cashMovement.create({
          data: {
            cashSessionId: baseCashMovement.cashSessionId,
            branchId: existing.branchId,
            expenseId: existing.id,
            type: 'ADJUSTMENT',
            amount: new Prisma.Decimal(Number(existing.amount)),
            method: 'CASH',
            description: `Reversion por anulacion de gasto ${existing.description}`,
            createdById: actor.userId,
          },
        });
      }

      return updated;
    });

    await auditService.record({
      userId: actor.userId,
      branchId: existing.branchId,
      action: 'EXPENSE_CANCELLED',
      entityName: 'Expense',
      entityId: expense.id,
      description: 'Anulacion de gasto operativo',
      metadata: {
        amount: existing.amount,
      },
    });

    return expense;
  }
}

export const expensesService = new ExpensesService();
