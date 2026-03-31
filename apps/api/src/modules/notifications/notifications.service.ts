import type { NotificationChannel, NotificationType, Prisma, PrismaClient } from '@prisma/client';

import { AppError } from '../../core/errors/app-error.js';
import { addDays, endOfDay, startOfDay } from '../../lib/date-utils.js';
import { normalizePageParams } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import { renderTemplate } from '../../lib/template.js';
import { auditService } from '../audit/audit.service.js';
import { notificationsRepository } from './notifications.repository.js';
import type { NotificationProvider } from './providers/notification.provider.js';
import { SimulatedNotificationProvider } from './providers/simulated-notification.provider.js';

type Actor = {
  userId?: string | null;
  branchId?: string | null;
};

type QueueNotificationInput = {
  branchId?: string;
  clientId?: string;
  userId?: string;
  templateCode?: string;
  type: NotificationType;
  channel: NotificationChannel;
  title?: string;
  body?: string;
  scheduledAt?: Date;
  context?: Record<string, unknown>;
};

const defaultRules = {
  membershipReminderDays: 5,
  classReminderHours: 24,
};

export class NotificationsService {
  constructor(
    private readonly db: PrismaClient = prisma,
    private readonly provider: NotificationProvider = new SimulatedNotificationProvider(),
  ) {}

  async list(input: {
    page?: number;
    pageSize?: number;
    branchId?: string;
    clientId?: string;
    userId?: string;
    type?: string;
    channel?: string;
    status?: string;
    q?: string;
  }) {
    const pagination = normalizePageParams(input.page, input.pageSize);
    const [items, total] = await Promise.all([
      notificationsRepository.list({ ...input, skip: pagination.skip, take: pagination.take }),
      notificationsRepository.count(input),
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

  async queue(input: QueueNotificationInput, actor?: Actor) {
    const payload = await this.resolveNotificationPayload(input);

    const notification = await this.db.notification.create({
      data: {
        branchId: input.branchId ?? actor?.branchId ?? null,
        clientId: input.clientId ?? null,
        userId: input.userId ?? null,
        templateId: payload.templateId,
        type: input.type,
        channel: input.channel,
        title: payload.title,
        body: payload.body,
        scheduledAt: input.scheduledAt,
        context: (input.context ?? {}) as Prisma.InputJsonValue,
      },
      include: {
        branch: true,
        client: true,
        user: true,
        template: true,
      },
    });

    await auditService.record({
      userId: actor?.userId,
      branchId: notification.branchId,
      action: 'NOTIFICATION_QUEUED',
      entityName: 'Notification',
      entityId: notification.id,
      description: `Notificacion ${notification.type} encolada`,
      metadata: {
        channel: notification.channel,
        scheduledAt: notification.scheduledAt,
      },
    });

    return notification;
  }

  async markRead(id: string, _actor?: Actor) {
    const existing = await notificationsRepository.findById(id);
    if (!existing) {
      throw new AppError('Notificacion no encontrada.', 404, 'NOTIFICATION_NOT_FOUND');
    }

    return this.db.notification.update({
      where: { id },
      data: {
        status: 'READ',
        readAt: existing.readAt ?? new Date(),
      },
    });
  }

  async processPending(limit: number, actor?: Actor) {
    const pending = await notificationsRepository.findPending(limit);
    const results: Array<{ id: string; status: 'SENT' | 'FAILED'; providerReference?: string; error?: string }> = [];

    for (const notification of pending) {
      const dispatch = await this.provider.send({
        id: notification.id,
        type: notification.type,
        channel: notification.channel,
        title: notification.title,
        body: notification.body,
        branchId: notification.branchId,
        clientId: notification.clientId,
        userId: notification.userId,
        context: (notification.context as Record<string, unknown> | null) ?? null,
      });

      if (dispatch.ok) {
        await this.db.notification.update({
          where: { id: notification.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        await auditService.record({
          userId: actor?.userId,
          branchId: notification.branchId,
          action: 'NOTIFICATION_SENT',
          entityName: 'Notification',
          entityId: notification.id,
          description: 'Notificacion procesada por provider simulado',
          metadata: { providerReference: dispatch.providerReference },
        });

        results.push({
          id: notification.id,
          status: 'SENT',
          providerReference: dispatch.providerReference,
        });
      } else {
        await this.db.notification.update({
          where: { id: notification.id },
          data: {
            status: 'FAILED',
            failureReason: dispatch.error,
          },
        });

        await auditService.record({
          userId: actor?.userId,
          branchId: notification.branchId,
          action: 'NOTIFICATION_FAILED',
          entityName: 'Notification',
          entityId: notification.id,
          description: 'Fallo el procesamiento de una notificacion',
          metadata: { error: dispatch.error },
        });

        results.push({
          id: notification.id,
          status: 'FAILED',
          error: dispatch.error,
        });
      }
    }

    return {
      processed: results.length,
      results,
    };
  }

  async syncOperationalAlerts(input: { branchId?: string }, actor?: Actor) {
    const rules = await this.getOperationalRules();
    const now = new Date();
    const createdAfter = startOfDay(now);
    const branchId = input.branchId ?? actor?.branchId ?? undefined;

    const [expiringMemberships, expiredMemberships, overdueReceivables, lowStockCandidates, upcomingEnrollments] =
      await Promise.all([
        this.db.clientMembership.findMany({
          where: {
            deletedAt: null,
            branchId,
            status: 'ACTIVE',
            endsAt: {
              gte: now,
              lte: endOfDay(addDays(now, rules.membershipReminderDays)),
            },
          },
          include: {
            client: true,
            plan: true,
          },
        }),
        this.db.clientMembership.findMany({
          where: {
            deletedAt: null,
            branchId,
            endsAt: { lt: now },
            status: { in: ['ACTIVE', 'EXPIRED'] },
          },
          include: {
            client: true,
            plan: true,
          },
          take: 50,
        }),
        this.db.receivable.findMany({
          where: {
            deletedAt: null,
            branchId,
            status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] },
            dueDate: { lt: now },
            balanceAmount: { gt: 0 },
          },
          include: {
            client: true,
          },
          take: 50,
        }),
        this.db.product.findMany({
          where: {
            deletedAt: null,
            branchId,
            status: 'ACTIVE',
          },
          include: {
            branch: true,
          },
        }),
        this.db.classEnrollment.findMany({
          where: {
            status: 'ENROLLED',
            schedule: {
              branchId,
              status: 'SCHEDULED',
              startsAt: {
                gte: now,
                lte: new Date(now.getTime() + rules.classReminderHours * 60 * 60 * 1000),
              },
            },
          },
          include: {
            client: true,
            schedule: {
              include: {
                activity: true,
                branch: true,
              },
            },
          },
          take: 100,
        }),
      ]);

    const lowStockProducts = lowStockCandidates.filter((product) => product.stock <= product.minStock);

    let created = 0;

    for (const membership of expiringMemberships) {
      const title = `Membresia por vencer: ${membership.client.firstName} ${membership.client.lastName}`;
      created += await this.queueOnce(
        {
          type: 'MEMBERSHIP_EXPIRING',
          branchId: membership.branchId,
          clientId: membership.clientId,
          channel: 'INTERNAL',
          title,
          body: `La membresia ${membership.plan.name} vence el ${membership.endsAt.toISOString()}.`,
          context: {
            membershipId: membership.id,
            endsAt: membership.endsAt.toISOString(),
            planName: membership.plan.name,
          },
        },
        createdAfter,
        actor,
      );
    }

    for (const membership of expiredMemberships) {
      const title = `Membresia vencida: ${membership.client.firstName} ${membership.client.lastName}`;
      created += await this.queueOnce(
        {
          type: 'MEMBERSHIP_EXPIRED',
          branchId: membership.branchId,
          clientId: membership.clientId,
          channel: 'INTERNAL',
          title,
          body: `La membresia ${membership.plan.name} ya vencio y requiere seguimiento.`,
          context: {
            membershipId: membership.id,
            endsAt: membership.endsAt.toISOString(),
            planName: membership.plan.name,
          },
        },
        createdAfter,
        actor,
      );
    }

    for (const receivable of overdueReceivables) {
      const title = `Deuda vencida: ${receivable.client.firstName} ${receivable.client.lastName}`;
      created += await this.queueOnce(
        {
          type: 'OVERDUE_DEBT',
          branchId: receivable.branchId,
          clientId: receivable.clientId,
          channel: 'INTERNAL',
          title,
          body: `La deuda ${receivable.description} permanece vencida con saldo ${receivable.balanceAmount}.`,
          context: {
            receivableId: receivable.id,
            dueDate: receivable.dueDate.toISOString(),
            balanceAmount: Number(receivable.balanceAmount),
          },
        },
        createdAfter,
        actor,
      );
    }

    for (const product of lowStockProducts) {
      const title = `Stock bajo: ${product.name}`;
      created += await this.queueOnce(
        {
          type: 'STOCK_LOW',
          branchId: product.branchId ?? undefined,
          channel: 'INTERNAL',
          title,
          body: `El producto ${product.name} quedo con stock ${product.stock} y minimo ${product.minStock}.`,
          context: {
            productId: product.id,
            stock: product.stock,
            minStock: product.minStock,
          },
        },
        createdAfter,
        actor,
      );
    }

    for (const enrollment of upcomingEnrollments) {
      const title = `Recordatorio de clase: ${enrollment.schedule.activity.name}`;
      created += await this.queueOnce(
        {
          type: 'CLASS_REMINDER',
          branchId: enrollment.schedule.branchId,
          clientId: enrollment.clientId,
          channel: 'INTERNAL',
          title,
          body: `Clase programada para ${enrollment.client.firstName} ${enrollment.client.lastName} el ${enrollment.schedule.startsAt.toISOString()}.`,
          context: {
            enrollmentId: enrollment.id,
            scheduleId: enrollment.scheduleId,
            activityName: enrollment.schedule.activity.name,
            startsAt: enrollment.schedule.startsAt.toISOString(),
          },
          scheduledAt: enrollment.schedule.startsAt,
        },
        createdAfter,
        actor,
      );
    }

    return {
      created,
      scanned: {
        expiringMemberships: expiringMemberships.length,
        expiredMemberships: expiredMemberships.length,
        overdueReceivables: overdueReceivables.length,
        lowStockProducts: lowStockProducts.length,
        upcomingEnrollments: upcomingEnrollments.length,
      },
    };
  }

  async queueAccessDenied(input: {
    branchId: string;
    clientId?: string | null;
    title: string;
    body: string;
    context?: Record<string, unknown>;
  }) {
    return this.queue({
      branchId: input.branchId,
      clientId: input.clientId ?? undefined,
      type: 'ACCESS_DENIED',
      channel: 'INTERNAL',
      title: input.title,
      body: input.body,
      context: input.context,
    });
  }

  async queueLowStock(input: {
    branchId?: string | null;
    productId: string;
    title: string;
    body: string;
    context?: Record<string, unknown>;
  }) {
    const existing = await notificationsRepository.findRecentSimilar({
      type: 'STOCK_LOW',
      branchId: input.branchId ?? null,
      title: input.title,
      clientId: null,
      userId: null,
      createdAfter: startOfDay(),
    });

    if (existing) {
      return existing;
    }

    return this.queue({
      branchId: input.branchId ?? undefined,
      type: 'STOCK_LOW',
      channel: 'INTERNAL',
      title: input.title,
      body: input.body,
      context: {
        productId: input.productId,
        ...(input.context ?? {}),
      },
    });
  }

  private async queueOnce(input: QueueNotificationInput, createdAfter: Date, actor?: Actor) {
    const existing = await notificationsRepository.findRecentSimilar({
      type: input.type,
      branchId: input.branchId ?? null,
      clientId: input.clientId ?? null,
      userId: input.userId ?? null,
      title: input.title!,
      createdAfter,
    });

    if (existing) {
      return 0;
    }

    await this.queue(input, actor);
    return 1;
  }

  private async resolveNotificationPayload(input: QueueNotificationInput) {
    if (!input.templateCode) {
      return {
        templateId: null,
        title: input.title!,
        body: input.body!,
      };
    }

    const template = await notificationsRepository.findTemplateByCode(input.templateCode);
    if (!template || !template.isActive) {
      throw new AppError('La plantilla de notificacion no existe o esta inactiva.', 404, 'NOTIFICATION_TEMPLATE_NOT_FOUND');
    }

    return {
      templateId: template.id,
      title: template.subjectTemplate
        ? renderTemplate(template.subjectTemplate, input.context)
        : input.title ?? template.name,
      body: renderTemplate(template.bodyTemplate, input.context),
    };
  }

  private async getOperationalRules() {
    const setting = await this.db.systemSetting.findUnique({
      where: {
        group_key: {
          group: 'notifications',
          key: 'operational_rules',
        },
      },
    });

    const value = (setting?.value as Record<string, unknown> | null) ?? {};
    return {
      membershipReminderDays:
        typeof value.membershipReminderDays === 'number'
          ? value.membershipReminderDays
          : defaultRules.membershipReminderDays,
      classReminderHours:
        typeof value.classReminderHours === 'number'
          ? value.classReminderHours
          : defaultRules.classReminderHours,
    };
  }
}

export const notificationsService = new NotificationsService();
