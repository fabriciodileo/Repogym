import { Prisma } from '@prisma/client';

import { AppError } from '../../core/errors/app-error.js';
import { calculateNetAmount, deriveReceivableStatus } from '../../lib/finance.js';
import { normalizePageParams } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import { auditService } from '../audit/audit.service.js';
import { reserveFormattedSequence } from '../settings/settings.service.js';
import { paymentsRepository } from './payments.repository.js';

type PaymentInput = {
  clientId?: string;
  branchId?: string;
  concept?: string;
  grossAmount?: number;
  discountAmount?: number;
  surchargeAmount?: number;
  method?: 'CASH' | 'BANK_TRANSFER' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'DIGITAL_WALLET' | 'OTHER';
  reference?: string;
  notes?: string;
  paidAt?: Date;
  allocations?: Array<{
    receivableId: string;
    amount: number;
  }>;
};

export class PaymentsService {
  async list(input: { page?: number; pageSize?: number; clientId?: string; branchId?: string }) {
    const pagination = normalizePageParams(input.page, input.pageSize);
    const [items, total] = await Promise.all([
      paymentsRepository.list({ ...input, skip: pagination.skip, take: pagination.take }),
      paymentsRepository.count(input),
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

  listDebts(input: { clientId?: string; branchId?: string; overdueOnly?: boolean }) {
    return paymentsRepository.listDebts(input);
  }

  async create(input: PaymentInput, actor: { userId: string; branchId?: string | null }) {
    const expectedFinalAmount = calculateNetAmount(
      input.grossAmount!,
      input.discountAmount ?? 0,
      input.surchargeAmount ?? 0,
    );

    const allocationIds = (input.allocations ?? []).map((item) => item.receivableId);
    const receivables = allocationIds.length
      ? await paymentsRepository.findReceivablesByIds(allocationIds)
      : [];

    if (allocationIds.length && receivables.length !== allocationIds.length) {
      throw new AppError('Al menos una deuda seleccionada no existe.', 404, 'RECEIVABLE_NOT_FOUND');
    }

    const totalAllocated = (input.allocations ?? []).reduce((sum, item) => sum + item.amount, 0);

    if (input.allocations?.length && Number(totalAllocated.toFixed(2)) !== Number(expectedFinalAmount.toFixed(2))) {
      throw new AppError(
        'La suma aplicada a las deudas debe coincidir con el monto final del pago.',
        400,
        'ALLOCATION_MISMATCH',
      );
    }

    const payment = await prisma.$transaction(async (tx) => {
      const receiptNumber = await reserveFormattedSequence(tx, {
        group: 'sequence',
        key: 'receipt_number',
        prefix: 'REC-',
        padLength: 8,
        updatedById: actor.userId,
      });

      const paymentRecord = await tx.payment.create({
        data: {
          clientId: input.clientId ?? null,
          branchId: input.branchId!,
          concept: input.concept!,
          grossAmount: new Prisma.Decimal(input.grossAmount!),
          discountAmount: new Prisma.Decimal(input.discountAmount ?? 0),
          surchargeAmount: new Prisma.Decimal(input.surchargeAmount ?? 0),
          finalAmount: new Prisma.Decimal(expectedFinalAmount),
          method: input.method!,
          reference: input.reference,
          notes: input.notes,
          paidAt: input.paidAt ?? new Date(),
          receiptNumber,
          registeredById: actor.userId,
          allocations: input.allocations?.length
            ? {
                create: input.allocations.map((allocation) => ({
                  receivableId: allocation.receivableId,
                  amount: new Prisma.Decimal(allocation.amount),
                })),
              }
            : undefined,
        },
      });

      for (const allocation of input.allocations ?? []) {
        const receivable = receivables.find((item) => item.id === allocation.receivableId)!;
        const currentBalance = Number(receivable.balanceAmount);
        if (allocation.amount > currentBalance) {
          throw new AppError(
            `La aplicacion excede el saldo pendiente de la deuda ${receivable.id}.`,
            400,
            'ALLOCATION_EXCEEDS_BALANCE',
          );
        }

        const nextBalance = currentBalance - allocation.amount;
        const expectedAmount =
          Number(receivable.originalAmount) -
          Number(receivable.discountAmount) +
          Number(receivable.surchargeAmount);

        await tx.receivable.update({
          where: { id: receivable.id },
          data: {
            balanceAmount: new Prisma.Decimal(nextBalance),
            status: deriveReceivableStatus(nextBalance, expectedAmount, receivable.dueDate),
            settledAt: nextBalance <= 0 ? new Date() : null,
          },
        });
      }

      if (input.method === 'CASH') {
        const openCashSession = await tx.cashSession.findFirst({
          where: {
            branchId: input.branchId,
            status: 'OPEN',
          },
          orderBy: { openedAt: 'desc' },
        });

        if (openCashSession) {
          await tx.cashMovement.create({
            data: {
              cashSessionId: openCashSession.id,
              branchId: input.branchId!,
              paymentId: paymentRecord.id,
              type: 'INCOME',
              amount: new Prisma.Decimal(expectedFinalAmount),
              method: 'CASH',
              description: input.concept!,
              createdById: actor.userId,
            },
          });
        }
      }

      return tx.payment.findUniqueOrThrow({
        where: { id: paymentRecord.id },
        include: {
          allocations: {
            include: {
              receivable: true,
            },
          },
          client: true,
          registeredBy: true,
        },
      });
    });

    await auditService.record({
      userId: actor.userId,
      branchId: input.branchId,
      action: 'PAYMENT_REGISTERED',
      entityName: 'Payment',
      entityId: payment.id,
      description: 'Registro de pago',
      metadata: {
        method: payment.method,
        finalAmount: payment.finalAmount,
      },
    });

    return payment;
  }

  async void(id: string, reason: string, actor: { userId: string; branchId?: string | null }) {
    const payment = await paymentsRepository.findPaymentById(id);

    if (!payment) {
      throw new AppError('Pago no encontrado.', 404, 'PAYMENT_NOT_FOUND');
    }

    if (payment.status === 'VOIDED') {
      throw new AppError('El pago ya fue anulado.', 400, 'PAYMENT_ALREADY_VOIDED');
    }

    const voidedPayment = await prisma.$transaction(async (tx) => {
      for (const allocation of payment.allocations) {
        const receivable = await tx.receivable.findUniqueOrThrow({
          where: { id: allocation.receivableId },
        });

        const nextBalance = Number(receivable.balanceAmount) + Number(allocation.amount);
        const expectedAmount =
          Number(receivable.originalAmount) -
          Number(receivable.discountAmount) +
          Number(receivable.surchargeAmount);

        await tx.receivable.update({
          where: { id: receivable.id },
          data: {
            balanceAmount: new Prisma.Decimal(nextBalance),
            status: deriveReceivableStatus(nextBalance, expectedAmount, receivable.dueDate),
            settledAt: null,
          },
        });
      }

      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          status: 'VOIDED',
          voidedAt: new Date(),
          voidedById: actor.userId,
          voidReason: reason,
        },
        include: {
          allocations: true,
          registeredBy: true,
          client: true,
        },
      });

      if (payment.method === 'CASH') {
        const openCashSession = await tx.cashSession.findFirst({
          where: {
            branchId: payment.branchId,
            status: 'OPEN',
          },
          orderBy: { openedAt: 'desc' },
        });

        if (openCashSession) {
          await tx.cashMovement.create({
            data: {
              cashSessionId: openCashSession.id,
              branchId: payment.branchId,
              paymentId: payment.id,
              type: 'ADJUSTMENT',
              amount: new Prisma.Decimal(Number(payment.finalAmount) * -1),
              method: payment.method,
              description: `Anulacion ${payment.concept}`,
              createdById: actor.userId,
            },
          });
        }
      }

      return updatedPayment;
    });

    await auditService.record({
      userId: actor.userId,
      branchId: payment.branchId,
      action: 'PAYMENT_VOIDED',
      entityName: 'Payment',
      entityId: payment.id,
      description: 'Anulacion de pago',
      metadata: { reason },
    });

    return voidedPayment;
  }
}

export const paymentsService = new PaymentsService();
