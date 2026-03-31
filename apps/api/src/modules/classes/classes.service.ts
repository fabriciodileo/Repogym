import { Prisma } from '@prisma/client';

import { AppError } from '../../core/errors/app-error.js';
import { deriveReceivableStatus } from '../../lib/finance.js';
import { notificationsService } from '../notifications/notifications.service.js';
import { auditService } from '../audit/audit.service.js';
import { classesRepository } from './classes.repository.js';
import { prisma } from '../../lib/prisma.js';

type Actor = {
  userId: string;
  branchId?: string | null;
};

type ActivityInput = {
  branchId?: string;
  code?: string;
  name?: string;
  description?: string;
  capacity?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'CANCELLED';
  requiresValidMembership?: boolean;
  extraFee?: number;
  isIncludedByDefault?: boolean;
};

type ScheduleInput = {
  activityId?: string;
  branchId?: string;
  instructorId?: string;
  startsAt?: Date;
  endsAt?: Date;
  room?: string;
  capacityOverride?: number;
};

type EnrollmentInput = {
  clientId?: string;
  scheduleId?: string;
  notes?: string;
};

const isMembershipValidForSchedule = (membership: {
  startsAt: Date;
  endsAt: Date;
  branchId: string;
  plan: { includesSpecialClasses: boolean; branchLinks: Array<{ branchId: string }>; activityAccesses: Array<{ activityId: string }> };
}, schedule: { startsAt: Date; branchId: string; activityId: string; activity: { isIncludedByDefault: boolean } }) => {
  const inRange = membership.startsAt <= schedule.startsAt && membership.endsAt >= schedule.startsAt;
  const branchAllowed = membership.plan.branchLinks.length === 0 || membership.plan.branchLinks.some((link) => link.branchId === schedule.branchId);
  const activityAllowed =
    schedule.activity.isIncludedByDefault ||
    membership.plan.includesSpecialClasses ||
    membership.plan.activityAccesses.some((item) => item.activityId === schedule.activityId);

  return inRange && branchAllowed && activityAllowed;
};

export class ClassesService {
  listActivities(input: { branchId?: string; status?: string; q?: string }) {
    return classesRepository.listActivities(input);
  }

  listSchedules(input: { branchId?: string; activityId?: string; status?: string; dateFrom?: Date; dateTo?: Date }) {
    return classesRepository.listSchedules(input);
  }

  listEnrollments(input: { branchId?: string; scheduleId?: string; clientId?: string; status?: string }) {
    return classesRepository.listEnrollments(input);
  }

  async createActivity(input: ActivityInput, actor: Actor) {
    const duplicate = await classesRepository.findActivityByCode(input.code!);
    if (duplicate && !duplicate.deletedAt) {
      throw new AppError('Ya existe una actividad con ese codigo.', 409, 'ACTIVITY_CODE_EXISTS');
    }

    const activity = await prisma.activity.create({
      data: {
        branchId: input.branchId ?? null,
        code: input.code!,
        name: input.name!,
        description: input.description,
        capacity: input.capacity!,
        status: input.status ?? 'ACTIVE',
        requiresValidMembership: input.requiresValidMembership ?? true,
        extraFee: input.extraFee !== undefined ? new Prisma.Decimal(input.extraFee) : undefined,
        isIncludedByDefault: input.isIncludedByDefault ?? false,
      },
      include: {
        branch: true,
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: activity.branchId,
      action: 'CLASS_SCHEDULED',
      entityName: 'Activity',
      entityId: activity.id,
      description: 'Alta de actividad',
    });

    return activity;
  }

  async updateActivity(id: string, input: ActivityInput, actor: Actor) {
    const existing = await classesRepository.findActivityById(id);
    if (!existing || existing.deletedAt) {
      throw new AppError('Actividad no encontrada.', 404, 'ACTIVITY_NOT_FOUND');
    }

    if (input.code && input.code !== existing.code) {
      const duplicate = await classesRepository.findActivityByCode(input.code);
      if (duplicate && duplicate.id !== id && !duplicate.deletedAt) {
        throw new AppError('Ya existe una actividad con ese codigo.', 409, 'ACTIVITY_CODE_EXISTS');
      }
    }

    const activity = await prisma.activity.update({
      where: { id },
      data: {
        branchId: input.branchId,
        code: input.code,
        name: input.name,
        description: input.description,
        capacity: input.capacity,
        status: input.status,
        requiresValidMembership: input.requiresValidMembership,
        extraFee: input.extraFee !== undefined ? new Prisma.Decimal(input.extraFee) : undefined,
        isIncludedByDefault: input.isIncludedByDefault,
      },
      include: {
        branch: true,
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: activity.branchId,
      action: 'UPDATE',
      entityName: 'Activity',
      entityId: activity.id,
      description: 'Actualizacion de actividad',
    });

    return activity;
  }

  async createSchedule(input: ScheduleInput, actor: Actor) {
    const activity = await classesRepository.findActivityById(input.activityId!);
    if (!activity || activity.deletedAt || activity.status !== 'ACTIVE') {
      throw new AppError('Actividad no encontrada o inactiva.', 404, 'ACTIVITY_NOT_FOUND');
    }

    if (input.endsAt! <= input.startsAt!) {
      throw new AppError('La fecha de fin debe ser posterior al inicio.', 400, 'CLASS_SCHEDULE_RANGE_INVALID');
    }

    const schedule = await prisma.classSchedule.create({
      data: {
        activityId: input.activityId!,
        branchId: input.branchId!,
        instructorId: input.instructorId,
        startsAt: input.startsAt!,
        endsAt: input.endsAt!,
        room: input.room,
        capacityOverride: input.capacityOverride,
      },
      include: {
        branch: true,
        activity: true,
        instructor: true,
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: schedule.branchId,
      action: 'CLASS_SCHEDULED',
      entityName: 'ClassSchedule',
      entityId: schedule.id,
      description: 'Alta de horario de clase',
    });

    return schedule;
  }

  async updateSchedule(id: string, input: ScheduleInput, actor: Actor) {
    const existing = await classesRepository.findScheduleById(id);
    if (!existing) {
      throw new AppError('Horario de clase no encontrado.', 404, 'CLASS_SCHEDULE_NOT_FOUND');
    }

    if (existing.status === 'CANCELLED') {
      throw new AppError('No se puede editar un horario cancelado.', 409, 'CLASS_SCHEDULE_CANCELLED');
    }

    const startsAt = input.startsAt ?? existing.startsAt;
    const endsAt = input.endsAt ?? existing.endsAt;
    if (endsAt <= startsAt) {
      throw new AppError('La fecha de fin debe ser posterior al inicio.', 400, 'CLASS_SCHEDULE_RANGE_INVALID');
    }

    const schedule = await prisma.classSchedule.update({
      where: { id },
      data: {
        activityId: input.activityId,
        branchId: input.branchId,
        instructorId: input.instructorId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        room: input.room,
        capacityOverride: input.capacityOverride,
      },
      include: {
        branch: true,
        activity: true,
        instructor: true,
        enrollments: true,
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: schedule.branchId,
      action: 'UPDATE',
      entityName: 'ClassSchedule',
      entityId: schedule.id,
      description: 'Actualizacion de horario de clase',
    });

    return schedule;
  }

  async cancelSchedule(id: string, reason: string, actor: Actor) {
    const existing = await classesRepository.findScheduleById(id);
    if (!existing) {
      throw new AppError('Horario de clase no encontrado.', 404, 'CLASS_SCHEDULE_NOT_FOUND');
    }

    if (existing.status === 'CANCELLED') {
      throw new AppError('El horario ya esta cancelado.', 409, 'CLASS_SCHEDULE_CANCELLED');
    }

    const schedule = await prisma.$transaction(async (tx) => {
      await tx.classEnrollment.updateMany({
        where: {
          scheduleId: existing.id,
          status: { in: ['ENROLLED', 'WAITLISTED'] },
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          notes: `Cancelada por cierre de clase: ${reason}`,
        },
      });

      const cancelled = await tx.classSchedule.update({
        where: { id: existing.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason,
        },
        include: {
          branch: true,
          activity: true,
          enrollments: {
            include: {
              client: true,
            },
          },
        },
      });

      return cancelled;
    });

    for (const enrollment of existing.enrollments.filter((item) => item.status === 'ENROLLED' || item.status === 'WAITLISTED')) {
      await notificationsService.queue({
        branchId: existing.branchId,
        clientId: enrollment.clientId,
        type: 'CLASS_CANCELLED',
        channel: 'INTERNAL',
        title: `Clase cancelada: ${existing.activity.name}`,
        body: `La clase programada para ${existing.startsAt.toISOString()} fue cancelada.`,
        context: {
          scheduleId: existing.id,
          activityName: existing.activity.name,
        },
      });
    }

    await auditService.record({
      userId: actor.userId,
      branchId: schedule.branchId,
      action: 'CLASS_CANCELLED',
      entityName: 'ClassSchedule',
      entityId: schedule.id,
      description: 'Cancelacion de clase',
      metadata: { reason },
    });

    return schedule;
  }

  async enroll(input: EnrollmentInput, actor: Actor) {
    const schedule = await classesRepository.findScheduleById(input.scheduleId!);
    if (!schedule) {
      throw new AppError('Horario de clase no encontrado.', 404, 'CLASS_SCHEDULE_NOT_FOUND');
    }

    if (schedule.status === 'CANCELLED') {
      throw new AppError('No se puede inscribir en una clase cancelada.', 409, 'CLASS_SCHEDULE_CANCELLED');
    }

    const client = await prisma.client.findFirst({
      where: {
        id: input.clientId,
        deletedAt: null,
      },
    });

    if (!client) {
      throw new AppError('Cliente no encontrado.', 404, 'CLIENT_NOT_FOUND');
    }

    if (client.status !== 'ACTIVE') {
      throw new AppError('El cliente no se encuentra habilitado para clases.', 409, 'CLIENT_NOT_ACTIVE');
    }

    const duplicate = schedule.enrollments.find((enrollment) => enrollment.clientId === client.id && enrollment.status !== 'CANCELLED');
    if (duplicate) {
      throw new AppError('El cliente ya esta inscripto en este horario.', 409, 'CLASS_ENROLLMENT_EXISTS');
    }

    const activeSeats = schedule.enrollments.filter((enrollment) => ['ENROLLED', 'ATTENDED', 'NO_SHOW'].includes(enrollment.status)).length;
    const capacity = schedule.capacityOverride ?? schedule.activity.capacity;
    if (activeSeats >= capacity) {
      throw new AppError('No hay cupos disponibles para este horario.', 409, 'CLASS_SCHEDULE_FULL');
    }

    if (schedule.activity.requiresValidMembership) {
      const membership = await prisma.clientMembership.findFirst({
        where: {
          clientId: client.id,
          deletedAt: null,
          status: 'ACTIVE',
          startsAt: { lte: schedule.startsAt },
          endsAt: { gte: schedule.startsAt },
        },
        include: {
          plan: {
            include: {
              branchLinks: true,
              activityAccesses: true,
            },
          },
        },
        orderBy: { endsAt: 'desc' },
      });

      if (!membership || !isMembershipValidForSchedule(membership, schedule)) {
        throw new AppError('El cliente no posee una membresia valida para esta actividad.', 409, 'CLASS_MEMBERSHIP_REQUIRED');
      }
    }

    const enrollment = await prisma.$transaction(async (tx) => {
      const created = await tx.classEnrollment.create({
        data: {
          clientId: client.id,
          scheduleId: schedule.id,
          notes: input.notes,
        },
        include: {
          client: true,
          schedule: {
            include: {
              branch: true,
              activity: true,
            },
          },
          receivables: true,
        },
      });

      if (schedule.activity.extraFee && Number(schedule.activity.extraFee) > 0) {
        await tx.receivable.create({
          data: {
            clientId: client.id,
            branchId: schedule.branchId,
            classEnrollmentId: created.id,
            type: 'CLASS_ENROLLMENT',
            description: `Inscripcion a clase ${schedule.activity.name}`,
            originalAmount: new Prisma.Decimal(Number(schedule.activity.extraFee)),
            discountAmount: new Prisma.Decimal(0),
            surchargeAmount: new Prisma.Decimal(0),
            balanceAmount: new Prisma.Decimal(Number(schedule.activity.extraFee)),
            dueDate: schedule.startsAt,
            status: deriveReceivableStatus(Number(schedule.activity.extraFee), Number(schedule.activity.extraFee), schedule.startsAt),
          },
        });
      }

      return created;
    });

    await auditService.record({
      userId: actor.userId,
      branchId: schedule.branchId,
      action: 'ENROLLMENT_CREATED',
      entityName: 'ClassEnrollment',
      entityId: enrollment.id,
      description: 'Inscripcion de cliente a clase',
      metadata: {
        clientId: client.id,
        scheduleId: schedule.id,
      },
    });

    return enrollment;
  }

  async cancelEnrollment(id: string, reason: string, actor: Actor) {
    const existing = await classesRepository.findEnrollmentById(id);
    if (!existing) {
      throw new AppError('Inscripcion no encontrada.', 404, 'CLASS_ENROLLMENT_NOT_FOUND');
    }

    if (existing.status === 'CANCELLED') {
      throw new AppError('La inscripcion ya se encuentra cancelada.', 409, 'CLASS_ENROLLMENT_CANCELLED');
    }

    const enrollment = await prisma.$transaction(async (tx) => {
      await tx.receivable.updateMany({
        where: {
          classEnrollmentId: existing.id,
          status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] },
        },
        data: {
          status: 'CANCELLED',
          balanceAmount: new Prisma.Decimal(0),
          cancelledAt: new Date(),
          cancelledReason: reason,
        },
      });

      return tx.classEnrollment.update({
        where: { id: existing.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          notes: reason,
        },
      });
    });

    await auditService.record({
      userId: actor.userId,
      branchId: existing.schedule.branchId,
      action: 'ENROLLMENT_CANCELLED',
      entityName: 'ClassEnrollment',
      entityId: enrollment.id,
      description: 'Cancelacion de inscripcion a clase',
      metadata: { reason },
    });

    return enrollment;
  }

  async registerAttendance(id: string, input: { status: 'ATTENDED' | 'NO_SHOW'; notes?: string }, actor: Actor) {
    const existing = await classesRepository.findEnrollmentById(id);
    if (!existing) {
      throw new AppError('Inscripcion no encontrada.', 404, 'CLASS_ENROLLMENT_NOT_FOUND');
    }

    const enrollment = await prisma.classEnrollment.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        checkedInAt: input.status === 'ATTENDED' ? new Date() : null,
        notes: input.notes ?? existing.notes,
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: existing.schedule.branchId,
      action: 'ENROLLMENT_ATTENDED',
      entityName: 'ClassEnrollment',
      entityId: enrollment.id,
      description: `Registro de asistencia ${input.status}`,
    });

    return enrollment;
  }
}

export const classesService = new ClassesService();
