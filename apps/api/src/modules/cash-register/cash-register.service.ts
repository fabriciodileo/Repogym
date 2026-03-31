import { Prisma } from '@prisma/client';

import { AppError } from '../../core/errors/app-error.js';
import { normalizePageParams } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import { auditService } from '../audit/audit.service.js';
import { cashRegisterRepository } from './cash-register.repository.js';

type Actor = {
  userId: string;
  branchId?: string | null;
};

type ManualMovementInput = {
  type: 'INCOME' | 'EXPENSE' | 'ADJUSTMENT';
  amount: number;
  method?: 'CASH' | 'BANK_TRANSFER' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'DIGITAL_WALLET' | 'OTHER';
  description: string;
  reference?: string;
  metadata?: Record<string, unknown>;
};

const calculateExpectedAmount = (openingAmount: number, movements: Array<{ type: string; amount: unknown }>) =>
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

export class CashRegisterService {
  async listSessions(input: { page?: number; pageSize?: number; branchId?: string; status?: string }) {
    const pagination = normalizePageParams(input.page, input.pageSize);
    const [items, total] = await Promise.all([
      cashRegisterRepository.listSessions({ ...input, skip: pagination.skip, take: pagination.take }),
      cashRegisterRepository.countSessions(input),
    ]);

    return {
      data: items,
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
    };
  }

  async getStatus(branchId?: string) {
    const resolvedBranchId =
      branchId ?? (await prisma.branch.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' } }))?.id;

    if (!resolvedBranchId) {
      throw new AppError('No hay sucursales disponibles.', 404, 'BRANCH_NOT_FOUND');
    }

    const currentSession = await cashRegisterRepository.findOpenSessionByBranch(resolvedBranchId);
    if (!currentSession) {
      return {
        branchId: resolvedBranchId,
        isOpen: false,
        currentSession: null,
      };
    }

    const expectedAmount = calculateExpectedAmount(Number(currentSession.openingAmount), currentSession.movements);
    const byMethod = this.buildMethodSummary(currentSession.movements);

    return {
      branchId: resolvedBranchId,
      isOpen: true,
      currentSession: {
        ...currentSession,
        expectedAmount,
        byMethod,
      },
    };
  }

  async openSession(input: { branchId?: string; openingAmount?: number; notes?: string }, actor: Actor) {
    const branch = await prisma.branch.findFirst({ where: { id: input.branchId, deletedAt: null } });
    if (!branch) {
      throw new AppError('Sucursal no encontrada.', 404, 'BRANCH_NOT_FOUND');
    }

    const existingOpen = await cashRegisterRepository.findOpenSessionByBranch(branch.id);
    if (existingOpen) {
      throw new AppError('Ya existe una caja abierta para esta sucursal.', 409, 'CASH_SESSION_ALREADY_OPEN');
    }

    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.cashSession.create({
        data: {
          branchId: branch.id,
          openedById: actor.userId,
          openingAmount: new Prisma.Decimal(input.openingAmount ?? 0),
          notes: input.notes,
        },
      });

      await tx.cashMovement.create({
        data: {
          cashSessionId: created.id,
          branchId: branch.id,
          type: 'OPENING',
          amount: new Prisma.Decimal(input.openingAmount ?? 0),
          method: 'CASH',
          description: 'Apertura de caja',
          createdById: actor.userId,
        },
      });

      return tx.cashSession.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          branch: true,
          openedBy: true,
          movements: true,
        },
      });
    });

    await auditService.record({
      userId: actor.userId,
      branchId: branch.id,
      action: 'CASH_OPENED',
      entityName: 'CashSession',
      entityId: session.id,
      description: 'Apertura de caja',
      metadata: {
        openingAmount: session.openingAmount,
      },
    });

    return session;
  }

  async addManualMovement(sessionId: string, input: ManualMovementInput, actor: Actor) {
    const session = await cashRegisterRepository.findSessionById(sessionId);
    if (!session) {
      throw new AppError('Caja no encontrada.', 404, 'CASH_SESSION_NOT_FOUND');
    }

    if (session.status !== 'OPEN') {
      throw new AppError('La caja seleccionada ya esta cerrada.', 409, 'CASH_SESSION_CLOSED');
    }

    if ((input.type === 'INCOME' || input.type === 'EXPENSE') && input.amount < 0) {
      throw new AppError('Los ingresos y egresos manuales deben informarse en positivo.', 400, 'CASH_MOVEMENT_AMOUNT_INVALID');
    }

    const movement = await prisma.cashMovement.create({
      data: {
        cashSessionId: session.id,
        branchId: session.branchId,
        type: input.type,
        amount: new Prisma.Decimal(input.amount),
        method: input.method ?? 'CASH',
        description: input.description,
        reference: input.reference,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        createdById: actor.userId,
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: session.branchId,
      action: 'CASH_MOVEMENT_RECORDED',
      entityName: 'CashMovement',
      entityId: movement.id,
      description: `Movimiento manual de caja: ${input.type}`,
      metadata: {
        amount: input.amount,
        method: input.method,
      },
    });

    return movement;
  }

  async closeSession(id: string, input: { closingAmount?: number; notes?: string }, actor: Actor) {
    const session = await cashRegisterRepository.findSessionById(id);
    if (!session) {
      throw new AppError('Caja no encontrada.', 404, 'CASH_SESSION_NOT_FOUND');
    }

    if (session.status !== 'OPEN') {
      throw new AppError('La caja seleccionada ya esta cerrada.', 409, 'CASH_SESSION_CLOSED');
    }

    const expectedAmount = calculateExpectedAmount(Number(session.openingAmount), session.movements);
    const closingAmount = input.closingAmount ?? 0;
    const differenceAmount = Number((closingAmount - expectedAmount).toFixed(2));

    const closedSession = await prisma.$transaction(async (tx) => {
      await tx.cashMovement.create({
        data: {
          cashSessionId: session.id,
          branchId: session.branchId,
          type: 'CLOSING',
          amount: new Prisma.Decimal(closingAmount),
          method: 'CASH',
          description: 'Cierre de caja',
          createdById: actor.userId,
        },
      });

      return tx.cashSession.update({
        where: { id: session.id },
        data: {
          closedById: actor.userId,
          closedAt: new Date(),
          expectedAmount: new Prisma.Decimal(expectedAmount),
          closingAmount: new Prisma.Decimal(closingAmount),
          differenceAmount: new Prisma.Decimal(differenceAmount),
          notes: input.notes ?? session.notes,
          status: 'CLOSED',
        },
        include: {
          branch: true,
          openedBy: true,
          closedBy: true,
          movements: true,
        },
      });
    });

    await auditService.record({
      userId: actor.userId,
      branchId: session.branchId,
      action: 'CASH_CLOSED',
      entityName: 'CashSession',
      entityId: closedSession.id,
      description: 'Cierre de caja',
      metadata: {
        expectedAmount,
        closingAmount,
        differenceAmount,
      },
    });

    return closedSession;
  }

  async getSession(id: string) {
    const session = await cashRegisterRepository.findSessionById(id);
    if (!session) {
      throw new AppError('Caja no encontrada.', 404, 'CASH_SESSION_NOT_FOUND');
    }

    return {
      ...session,
      expectedAmount: calculateExpectedAmount(Number(session.openingAmount), session.movements),
      byMethod: this.buildMethodSummary(session.movements),
    };
  }

  private buildMethodSummary(movements: Array<{ type: string; amount: unknown; method: string | null }>) {
    return movements.reduce<Record<string, { income: number; expense: number; adjustment: number }>>((acc, movement) => {
      const method = movement.method ?? 'UNSPECIFIED';
      if (!acc[method]) {
        acc[method] = { income: 0, expense: 0, adjustment: 0 };
      }

      const amount = Number(movement.amount ?? 0);
      if (movement.type === 'INCOME') {
        acc[method].income += amount;
      } else if (movement.type === 'EXPENSE') {
        acc[method].expense += amount;
      } else if (movement.type === 'ADJUSTMENT') {
        acc[method].adjustment += amount;
      }

      return acc;
    }, {});
  }
}

export const cashRegisterService = new CashRegisterService();
