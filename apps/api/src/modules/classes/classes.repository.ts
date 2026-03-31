import { endOfDay, startOfDay } from '../../lib/date-utils.js';
import { prisma } from '../../lib/prisma.js';

export class ClassesRepository {
  listActivities(filters: { branchId?: string; status?: string; q?: string }) {
    return prisma.activity.findMany({
      where: {
        deletedAt: null,
        branchId: filters.branchId,
        status: filters.status as never,
        OR: filters.q
          ? [
              { code: { contains: filters.q, mode: 'insensitive' } },
              { name: { contains: filters.q, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        branch: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  findActivityById(id: string) {
    return prisma.activity.findUnique({
      where: { id },
      include: {
        branch: true,
        planAccesses: true,
      },
    });
  }

  findActivityByCode(code: string) {
    return prisma.activity.findUnique({ where: { code } });
  }

  listSchedules(filters: { branchId?: string; activityId?: string; status?: string; dateFrom?: Date; dateTo?: Date }) {
    return prisma.classSchedule.findMany({
      where: {
        branchId: filters.branchId,
        activityId: filters.activityId,
        status: filters.status as never,
        startsAt: {
          gte: filters.dateFrom ? startOfDay(filters.dateFrom) : undefined,
          lte: filters.dateTo ? endOfDay(filters.dateTo) : undefined,
        },
      },
      include: {
        branch: true,
        activity: true,
        instructor: true,
        enrollments: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  findScheduleById(id: string) {
    return prisma.classSchedule.findUnique({
      where: { id },
      include: {
        branch: true,
        activity: {
          include: {
            planAccesses: true,
          },
        },
        instructor: true,
        enrollments: {
          include: {
            client: true,
            receivables: true,
          },
        },
      },
    });
  }

  listEnrollments(filters: { branchId?: string; scheduleId?: string; clientId?: string; status?: string }) {
    return prisma.classEnrollment.findMany({
      where: {
        clientId: filters.clientId,
        scheduleId: filters.scheduleId,
        status: filters.status as never,
        schedule: {
          branchId: filters.branchId,
        },
      },
      include: {
        client: true,
        schedule: {
          include: {
            branch: true,
            activity: true,
            instructor: true,
          },
        },
        receivables: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  findEnrollmentById(id: string) {
    return prisma.classEnrollment.findUnique({
      where: { id },
      include: {
        client: true,
        schedule: {
          include: {
            branch: true,
            activity: {
              include: {
                planAccesses: true,
              },
            },
          },
        },
        receivables: true,
      },
    });
  }
}

export const classesRepository = new ClassesRepository();
