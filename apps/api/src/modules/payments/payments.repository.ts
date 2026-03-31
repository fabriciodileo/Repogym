import type { PrismaClient} from '@prisma/client';
import { type Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';

const buildPaymentWhere = (filters: { clientId?: string; branchId?: string }): Prisma.PaymentWhereInput => ({
  clientId: filters.clientId,
  branchId: filters.branchId,
});

const buildDebtWhere = (filters: { clientId?: string; branchId?: string; overdueOnly?: boolean }): Prisma.ReceivableWhereInput => ({
  deletedAt: null,
  clientId: filters.clientId,
  branchId: filters.branchId,
  status: filters.overdueOnly ? 'OVERDUE' : { in: ['OPEN', 'PARTIAL', 'OVERDUE'] },
});

export class PaymentsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  list(filters: { clientId?: string; branchId?: string; skip: number; take: number }) {
    return this.db.payment.findMany({
      where: buildPaymentWhere(filters),
      skip: filters.skip,
      take: filters.take,
      orderBy: { paidAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            memberNumber: true,
          },
        },
        registeredBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        allocations: {
          include: {
            receivable: true,
          },
        },
      },
    });
  }

  count(filters: { clientId?: string; branchId?: string }) {
    return this.db.payment.count({ where: buildPaymentWhere(filters) });
  }

  findReceivablesByIds(ids: string[]) {
    return this.db.receivable.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
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
      },
    });
  }

  findPaymentById(id: string) {
    return this.db.payment.findUnique({
      where: { id },
      include: {
        allocations: true,
      },
    });
  }

  listDebts(filters: { clientId?: string; branchId?: string; overdueOnly?: boolean }) {
    return this.db.receivable.findMany({
      where: buildDebtWhere(filters),
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        client: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        membership: {
          include: {
            plan: true,
          },
        },
      },
    });
  }
}

export const paymentsRepository = new PaymentsRepository();
