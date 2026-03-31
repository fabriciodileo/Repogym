import { z } from 'zod';

export const activityIdParamSchema = z.object({ id: z.string().cuid() });
export const scheduleIdParamSchema = z.object({ id: z.string().cuid() });
export const enrollmentIdParamSchema = z.object({ id: z.string().cuid() });

export const activitiesListQuerySchema = z.object({
  branchId: z.string().cuid().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CANCELLED']).optional(),
  q: z.string().trim().optional(),
});

export const schedulesListQuerySchema = z.object({
  branchId: z.string().cuid().optional(),
  activityId: z.string().cuid().optional(),
  status: z.enum(['SCHEDULED', 'CANCELLED', 'COMPLETED']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const enrollmentsListQuerySchema = z.object({
  branchId: z.string().cuid().optional(),
  scheduleId: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  status: z.enum(['ENROLLED', 'CANCELLED', 'WAITLISTED', 'ATTENDED', 'NO_SHOW']).optional(),
});

export const createActivitySchema = z.object({
  branchId: z.string().cuid().optional(),
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  description: z.string().optional(),
  capacity: z.number().int().positive(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CANCELLED']).optional(),
  requiresValidMembership: z.boolean().optional(),
  extraFee: z.number().min(0).optional(),
  isIncludedByDefault: z.boolean().optional(),
});

export const updateActivitySchema = createActivitySchema.partial();

export const createScheduleSchema = z.object({
  activityId: z.string().cuid(),
  branchId: z.string().cuid(),
  instructorId: z.string().cuid().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  room: z.string().optional(),
  capacityOverride: z.number().int().positive().optional(),
});

export const updateScheduleSchema = createScheduleSchema.partial();

export const cancelScheduleSchema = z.object({
  reason: z.string().min(3),
});

export const createEnrollmentSchema = z.object({
  clientId: z.string().cuid(),
  scheduleId: z.string().cuid(),
  notes: z.string().optional(),
});

export const cancelEnrollmentSchema = z.object({
  reason: z.string().min(3),
});

export const attendanceSchema = z.object({
  status: z.enum(['ATTENDED', 'NO_SHOW']),
  notes: z.string().optional(),
});
