import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../core/middleware/authorize.js';
import { validate } from '../../core/middleware/validate.js';
import { classesController } from './classes.controller.js';
import {
  activitiesListQuerySchema,
  activityIdParamSchema,
  attendanceSchema,
  cancelEnrollmentSchema,
  cancelScheduleSchema,
  createActivitySchema,
  createEnrollmentSchema,
  createScheduleSchema,
  enrollmentIdParamSchema,
  enrollmentsListQuerySchema,
  scheduleIdParamSchema,
  schedulesListQuerySchema,
  updateActivitySchema,
  updateScheduleSchema,
} from './classes.schemas.js';

export const classesRouter = Router();

classesRouter.use(authenticate);
classesRouter.get('/activities', validate({ query: activitiesListQuerySchema }), asyncHandler(classesController.listActivities));
classesRouter.post('/activities', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ body: createActivitySchema }), asyncHandler(classesController.createActivity));
classesRouter.patch('/activities/:id', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ params: activityIdParamSchema, body: updateActivitySchema }), asyncHandler(classesController.updateActivity));
classesRouter.get('/schedules', validate({ query: schedulesListQuerySchema }), asyncHandler(classesController.listSchedules));
classesRouter.post('/schedules', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ body: createScheduleSchema }), asyncHandler(classesController.createSchedule));
classesRouter.patch('/schedules/:id', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ params: scheduleIdParamSchema, body: updateScheduleSchema }), asyncHandler(classesController.updateSchedule));
classesRouter.post('/schedules/:id/cancel', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ params: scheduleIdParamSchema, body: cancelScheduleSchema }), asyncHandler(classesController.cancelSchedule));
classesRouter.get('/enrollments', validate({ query: enrollmentsListQuerySchema }), asyncHandler(classesController.listEnrollments));
classesRouter.post('/enrollments', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ body: createEnrollmentSchema }), asyncHandler(classesController.enroll));
classesRouter.post('/enrollments/:id/cancel', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ params: enrollmentIdParamSchema, body: cancelEnrollmentSchema }), asyncHandler(classesController.cancelEnrollment));
classesRouter.post('/enrollments/:id/attendance', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ params: enrollmentIdParamSchema, body: attendanceSchema }), asyncHandler(classesController.attendance));
