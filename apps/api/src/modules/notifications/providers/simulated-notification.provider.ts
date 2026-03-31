import { logger } from '../../../lib/logger.js';

import type {
  NotificationDispatchInput,
  NotificationDispatchResult,
  NotificationProvider,
} from './notification.provider.js';

export class SimulatedNotificationProvider implements NotificationProvider {
  async send(input: NotificationDispatchInput): Promise<NotificationDispatchResult> {
    logger.info(
      {
        notificationId: input.id,
        type: input.type,
        channel: input.channel,
        branchId: input.branchId,
        clientId: input.clientId,
        userId: input.userId,
      },
      'Simulated notification dispatched',
    );

    return {
      ok: true,
      providerReference: `sim-${input.channel.toLowerCase()}-${input.id}`,
    };
  }
}
