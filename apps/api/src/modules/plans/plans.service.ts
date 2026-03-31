import { Prisma } from '@prisma/client';

import { AppError } from '../../core/errors/app-error.js';
import { prisma } from '../../lib/prisma.js';
import { auditService } from '../audit/audit.service.js';
import { plansRepository } from './plans.repository.js';

type PlanInput = {
  code?: string;
  name?: string;
  description?: string;
  durationUnit?: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'SEMESTER' | 'YEAR' | 'CUSTOM';
  durationCount?: number;
  price?: number;
  accessLimit?: number | null;
  allowFreeze?: boolean;
  lateFeeEnabled?: boolean;
  lateFeePercent?: number | null;
  graceDays?: number;
  autoRenewEnabled?: boolean;
  includesSpecialClasses?: boolean;
  isActive?: boolean;
  branchIds?: string[];
  timeRules?: Array<{
    branchId?: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
};

const mapPlan = (plan: Awaited<ReturnType<typeof plansRepository.list>>[number]) => ({
  ...plan,
  branches: plan.branchLinks.map((item) => item.branch),
});

export class PlansService {
  async list(activeOnly?: boolean) {
    const plans = await plansRepository.list(activeOnly);
    return plans.map(mapPlan);
  }

  async create(input: PlanInput, actor: { userId: string; branchId?: string | null }) {
    const existing = await plansRepository.findByCode(input.code!);

    if (existing) {
      throw new AppError('Ya existe un plan con ese codigo.', 409, 'PLAN_CODE_EXISTS');
    }

    const plan = await prisma.membershipPlan.create({
      data: {
        code: input.code!,
        name: input.name!,
        description: input.description,
        durationUnit: input.durationUnit!,
        durationCount: input.durationCount!,
        price: new Prisma.Decimal(input.price!),
        accessLimit: input.accessLimit,
        allowFreeze: input.allowFreeze ?? false,
        lateFeeEnabled: input.lateFeeEnabled ?? false,
        lateFeePercent:
          input.lateFeePercent !== undefined && input.lateFeePercent !== null
            ? new Prisma.Decimal(input.lateFeePercent)
            : null,
        graceDays: input.graceDays ?? 0,
        autoRenewEnabled: input.autoRenewEnabled ?? false,
        includesSpecialClasses: input.includesSpecialClasses ?? false,
        isActive: input.isActive ?? true,
        branchLinks: input.branchIds?.length
          ? {
              create: input.branchIds.map((branchId) => ({ branchId })),
            }
          : undefined,
        timeRules: input.timeRules?.length
          ? {
              create: input.timeRules.map((rule) => ({
                branchId: rule.branchId ?? null,
                dayOfWeek: rule.dayOfWeek,
                startTime: rule.startTime,
                endTime: rule.endTime,
              })),
            }
          : undefined,
      },
      include: {
        branchLinks: {
          include: { branch: true },
        },
        timeRules: true,
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: actor.branchId,
      action: 'CREATE',
      entityName: 'MembershipPlan',
      entityId: plan.id,
      description: 'Alta de plan de membresia',
    });

    return mapPlan(plan as never);
  }

  async update(id: string, input: PlanInput, actor: { userId: string; branchId?: string | null }) {
    const existing = await plansRepository.findById(id);

    if (!existing) {
      throw new AppError('Plan no encontrado.', 404, 'PLAN_NOT_FOUND');
    }

    const plan = await prisma.membershipPlan.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        durationUnit: input.durationUnit,
        durationCount: input.durationCount,
        price: input.price !== undefined ? new Prisma.Decimal(input.price) : undefined,
        accessLimit: input.accessLimit,
        allowFreeze: input.allowFreeze,
        lateFeeEnabled: input.lateFeeEnabled,
        lateFeePercent:
          input.lateFeePercent !== undefined
            ? input.lateFeePercent !== null
              ? new Prisma.Decimal(input.lateFeePercent)
              : null
            : undefined,
        graceDays: input.graceDays,
        autoRenewEnabled: input.autoRenewEnabled,
        includesSpecialClasses: input.includesSpecialClasses,
        isActive: input.isActive,
        branchLinks: input.branchIds
          ? {
              deleteMany: {},
              create: input.branchIds.map((branchId) => ({ branchId })),
            }
          : undefined,
        timeRules: input.timeRules
          ? {
              deleteMany: {},
              create: input.timeRules.map((rule) => ({
                branchId: rule.branchId ?? null,
                dayOfWeek: rule.dayOfWeek,
                startTime: rule.startTime,
                endTime: rule.endTime,
              })),
            }
          : undefined,
      },
      include: {
        branchLinks: {
          include: { branch: true },
        },
        timeRules: true,
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: actor.branchId,
      action: 'UPDATE',
      entityName: 'MembershipPlan',
      entityId: plan.id,
      description: 'Actualizacion de plan de membresia',
    });

    return mapPlan(plan as never);
  }

  async softDelete(id: string, actor: { userId: string; branchId?: string | null }) {
    const existing = await plansRepository.findById(id);

    if (!existing) {
      throw new AppError('Plan no encontrado.', 404, 'PLAN_NOT_FOUND');
    }

    const plan = await prisma.membershipPlan.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: actor.branchId,
      action: 'SOFT_DELETE',
      entityName: 'MembershipPlan',
      entityId: plan.id,
      description: 'Baja logica de plan',
    });

    return plan;
  }
}

export const plansService = new PlansService();
