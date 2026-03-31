import type { NotificationChannel, NotificationType } from '@prisma/client';

export type NotificationDispatchInput = {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  branchId?: string | null;
  clientId?: string | null;
  userId?: string | null;
  context?: Record<string, unknown> | null;
};

export type NotificationDispatchResult =
  | { ok: true; providerReference?: string }
  | { ok: false; error: string };

export interface NotificationProvider {
  send(input: NotificationDispatchInput): Promise<NotificationDispatchResult>;
}
