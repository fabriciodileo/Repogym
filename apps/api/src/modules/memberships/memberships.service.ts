import { Prisma } from '@prisma/client';

import { AppError } from '../../core/errors/app-error.js';
import { calculateMembershipEndDate, isCurrentRange } from '../../lib/date-utils.js';
import { calculateNetAmount } from '../../lib/finance.js';
import { normalizePageParams } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import { auditService } from '../audit/audit.service.js';
import { membershipsRepository } from './memberships.repository.js';

type MembershipCreateInput = {
  clientId?: string;
  planId?: string;
  branchId?: string;
  startsAt?: Date;
  dueDate?: Date;
  agreedAmount?: number;
  discountAmount?: number;
  surchargeAmount?: number;
  autoRenew?: boolean;
  notes?: string;
};

export class MembershipsService {
  async list(input: { page?: number; pageSize?: number; clientId?: string; branchId?: string; status?: any }) {
    const pagination = normalizePageParams(input.page, input.pageSize);
    const [items, total] = await Promise.all([
      membershipsRepository.list({ ...input, skip: pagination.skip, take: pagination.take }),
      membershipsRepository.count(input),
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

  async create(input: MembershipCreateInput, actor: { userId: string; branchId?: string | null }) {
    const client = await membershipsRepository.findClientById(input.clientId!);
    const plan = await membershipsRepository.findPlanById(input.planId!);

    if (!client) {
      throw new AppError('Cliente no encontrado.', 404, 'CLIENT_NOT_FOUND');
    }

    if (!plan) {
      throw new AppError('Plan no encontrado o inactivo.', 404, 'PLAN_NOT_FOUND');
    }

    if (plan.branchLinks.length > 0 && !plan.branchLinks.some((item) => item.branchId === input.branchId)) {
      throw new AppError(
        'El plan no esta habilitado para la sucursal seleccionada.',
        400,
        'PLAN_BRANCH_NOT_ALLOWED',
      );
    }

    const startsAt = input.startsAt!;
    const endsAt = calculateMembershipEndDate(startsAt, plan.durationUnit, plan.durationCount);
    const dueDate = input.dueDate ?? startsAt;
    const agreedAmount = input.agreedAmount ?? Number(plan.price);
    const discountAmount = input.discountAmount ?? 0;
    const surchargeAmount = input.surchargeAmount ?? 0;
    const netAmount = calculateNetAmount(agreedAmount, discountAmount, surchargeAmount);

    const membership = await prisma.$transaction(async (tx) => {
      const status = isCurrentRange(startsAt, endsAt) ? 'ACTIVE' : 'PENDING';
      const membershipRecord = await tx.clientMembership.create({
        data: {
          clientId: client.id,
          planId: plan.id,
          branchId: input.branchId!,
          status,
          startsAt,
          endsAt,
          activatedAt: status === 'ACTIVE' ? new Date() : null,
          agreedAmount: new Prisma.Decimal(agreedAmount),
          discountAmount: new Prisma.Decimal(discountAmount),
          surchargeAmount: new Prisma.Decimal(surchargeAmount),
          autoRenew: input.autoRenew ?? false,
          notes: input.notes,
          accessLimitSnapshot: plan.accessLimit,
          remainingAccesses: plan.accessLimit,
        },
      });

      await tx.receivable.create({
        data: {
          clientId: client.id,
          branchId: input.branchId!,
          membershipId: membershipRecord.id,
          type: 'MEMBERSHIP',
          description: `Membresia ${plan.name}`,
          originalAmount: new Prisma.Decimal(agreedAmount),
          discountAmount: new Prisma.Decimal(discountAmount),
          surchargeAmount: new Prisma.Decimal(surchargeAmount),
          balanceAmount: new Prisma.Decimal(netAmount),
          dueDate,
          status: dueDate < new Date() ? 'OVERDUE' : 'OPEN',
        },
      });

      return tx.clientMembership.findUniqueOrThrow({
        where: { id: membershipRecord.id },
        include: {
          client: true,
          plan: true,
          branch: true,
          receivables: true,
        },
      });
    });

    await auditService.record({
      userId: actor.userId,
      branchId: input.branchId,
      action: 'MEMBERSHIP_ASSIGNED',
      entityName: 'ClientMembership',
      entityId: membership.id,
      description: 'Asignacion de membresia a cliente',
      metadata: {
        clientId: client.id,
        planId: plan.id,
      },
    });

    return membership;
  }

  async renew(id: string, input: MembershipCreateInput, actor: { userId: string; branchId?: string | null }) {
    const existing = await membershipsRepository.findById(id);

    if (!existing) {
      throw new AppError('Membresia no encontrada.', 404, 'MEMBERSHIP_NOT_FOUND');
    }

    const nextMembership = await this.create(
      {
        clientId: existing.clientId,
        planId: existing.planId,
        branchId: existing.branchId,
        startsAt: input.startsAt ?? existing.endsAt,
        dueDate: input.dueDate,
        agreedAmount: input.agreedAmount ?? Number(existing.agreedAmount),
        discountAmount: input.discountAmount ?? Number(existing.discountAmount),
        surchargeAmount: input.surchargeAmount ?? Number(existing.surchargeAmount),
        autoRenew: input.autoRenew ?? existing.autoRenew,
        notes: input.notes,
      },
      actor,
    );

    await prisma.clientMembership.update({
      where: { id: nextMembership.id },
      data: {
        renewedFromId: existing.id,
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: existing.branchId,
      action: 'MEMBERSHIP_RENEWED',
      entityName: 'ClientMembership',
      entityId: nextMembership.id,
      description: 'Renovacion de membresia',
      metadata: {
        previousMembershipId: existing.id,
      },
    });

    return nextMembership;
  }

  async changeStatus(
    id: string,
    input: { action: 'PAUSE' | 'FREEZE' | 'CANCEL' | 'REACTIVATE'; reason: string; frozenUntil?: Date },
    actor: { userId: string; branchId?: string | null },
  ) {
    const existing = await membershipsRepository.findById(id);

    if (!existing) {
      throw new AppError('Membresia no encontrada.', 404, 'MEMBERSHIP_NOT_FOUND');
    }

    const nextData =
      input.action === 'PAUSE'
        ? {
            status: 'PAUSED' as const,
            pausedAt: new Date(),
            pauseReason: input.reason,
          }
        : input.action === 'FREEZE'
          ? {
              status: 'FROZEN' as const,
              frozenFrom: new Date(),
              frozenUntil: input.frozenUntil,
              freezeReason: input.reason,
            }
          : input.action === 'CANCEL'
            ? {
                status: 'CANCELLED' as const,
                cancelledAt: new Date(),
                cancelledReason: input.reason,
              }
            : {
                status: 'ACTIVE' as const,
                pauseReason: null,
                pausedAt: null,
                freezeReason: null,
                frozenFrom: null,
                frozenUntil: null,
                cancelledReason: null,
                cancelledAt: null,
              };

    const membership = await prisma.clientMembership.update({
      where: { id },
      data: nextData,
      include: {
        client: true,
        plan: true,
        branch: true,
        receivables: true,
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: existing.branchId,
      action:
        input.action === 'CANCEL' ? 'MEMBERSHIP_CANCELLED' : input.action === 'REACTIVATE' ? 'UPDATE' : 'UPDATE',
      entityName: 'ClientMembership',
      entityId: membership.id,
      description: `Cambio de estado de membresia: ${input.action}`,
      metadata: {
        action: input.action,
        reason: input.reason,
      },
    });

    return membership;
  }
}

export const membershipsService = new MembershipsService();
