import { Prisma } from '@prisma/client';

import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/app-error.js';
import { getDayOfWeek, getHourMinute, isCurrentRange } from '../../lib/date-utils.js';
import { normalizePageParams } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import { auditService } from '../audit/audit.service.js';
import { AccessGateway, SimulatedAccessGateway } from './access-control.gateway.js';
import { accessControlRepository } from './access-control.repository.js';

type ValidateInput = {
  branchId: string;
  identifier: string;
  method: 'RFID' | 'QR_CODE' | 'DNI' | 'MEMBER_NUMBER' | 'MANUAL_OVERRIDE' | 'API';
  deviceCode?: string;
  note?: string;
};

const buildDenyPayload = (reasonCode: string, message: string) => ({
  allowed: false,
  reasonCode,
  message,
});

export class AccessControlService {
  constructor(private readonly gateway: AccessGateway = new SimulatedAccessGateway()) {}

  async listLogs(input: { page?: number; pageSize?: number; branchId?: string; clientId?: string; result?: any }) {
    const pagination = normalizePageParams(input.page, input.pageSize);
    const [items, total] = await Promise.all([
      accessControlRepository.listLogs({ ...input, skip: pagination.skip, take: pagination.take }),
      accessControlRepository.countLogs(input),
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

  async validateAccess(input: ValidateInput, actor?: { userId?: string; branchId?: string | null }) {
    const device = input.deviceCode ? await accessControlRepository.findDeviceByCode(input.deviceCode) : null;

    if (device && !device.isActive) {
      const action = await this.gateway.denyAccess('Dispositivo inactivo', input.deviceCode);
      const log = await prisma.accessLog.create({
        data: {
          branchId: input.branchId,
          deviceId: device.id,
          method: input.method,
          result: 'DENIED',
          denialReason: 'DEVICE_INACTIVE',
          message: 'El dispositivo informado esta inactivo.',
          openedSimulated: false,
        },
      });

      await auditService.record({
        userId: actor?.userId,
        branchId: input.branchId,
        action: 'ACCESS_DENIED',
        entityName: 'AccessLog',
        entityId: log.id,
        description: 'Intento de acceso con dispositivo inactivo',
      });

      return {
        ...buildDenyPayload('DEVICE_INACTIVE', 'El dispositivo informado esta inactivo.'),
        action,
        logId: log.id,
      };
    }

    const client = await accessControlRepository.findClientByIdentifier(input.method, input.identifier);

    if (!client) {
      const action = await this.gateway.denyAccess('Cliente no encontrado', input.deviceCode);
      const log = await prisma.accessLog.create({
        data: {
          branchId: input.branchId,
          deviceId: device?.id,
          method: input.method,
          result: 'DENIED',
          denialReason: 'CLIENT_NOT_FOUND',
          message: 'No se encontro un cliente para el identificador recibido.',
          openedSimulated: false,
        },
      });

      await auditService.record({
        userId: actor?.userId,
        branchId: input.branchId,
        action: 'ACCESS_DENIED',
        entityName: 'AccessLog',
        entityId: log.id,
        description: 'Acceso denegado por cliente inexistente',
      });

      return {
        ...buildDenyPayload('CLIENT_NOT_FOUND', 'No se encontro un cliente para ese identificador.'),
        action,
        logId: log.id,
      };
    }

    if (client.status !== 'ACTIVE') {
      const action = await this.gateway.denyAccess('Cliente inactivo', input.deviceCode);
      const log = await prisma.accessLog.create({
        data: {
          clientId: client.id,
          branchId: input.branchId,
          deviceId: device?.id,
          method: input.method,
          result: 'DENIED',
          denialReason: 'CLIENT_INACTIVE',
          message: 'El cliente no se encuentra habilitado.',
          openedSimulated: false,
        },
      });

      return {
        ...buildDenyPayload('CLIENT_INACTIVE', 'El cliente no se encuentra activo.'),
        action,
        logId: log.id,
      };
    }

    if (client.administrativeBlock) {
      const action = await this.gateway.denyAccess('Bloqueo administrativo', input.deviceCode);
      const log = await prisma.accessLog.create({
        data: {
          clientId: client.id,
          branchId: input.branchId,
          deviceId: device?.id,
          method: input.method,
          result: 'DENIED',
          denialReason: 'ADMINISTRATIVE_BLOCK',
          message: client.administrativeBlockReason ?? 'Bloqueo administrativo activo.',
          openedSimulated: false,
        },
      });

      return {
        ...buildDenyPayload('ADMINISTRATIVE_BLOCK', client.administrativeBlockReason ?? 'Bloqueo administrativo activo.'),
        action,
        logId: log.id,
      };
    }

    const memberships = await accessControlRepository.findActiveMemberships(client.id);
    const now = new Date();
    const currentTime = getHourMinute(now);
    const currentDay = getDayOfWeek(now);

    const validMembership = memberships.find((membership) => {
      if (!isCurrentRange(membership.startsAt, membership.endsAt, now)) {
        return false;
      }

      if (
        membership.plan.branchLinks.length > 0 &&
        !membership.plan.branchLinks.some((item) => item.branchId === input.branchId)
      ) {
        return false;
      }

      const rules = membership.plan.timeRules.filter(
        (rule) => rule.dayOfWeek === currentDay && (!rule.branchId || rule.branchId === input.branchId),
      );

      if (!rules.length) {
        return true;
      }

      return rules.some((rule) => currentTime >= rule.startTime && currentTime <= rule.endTime);
    });

    if (!validMembership) {
      const action = await this.gateway.denyAccess('Membresia no valida', input.deviceCode);
      const log = await prisma.accessLog.create({
        data: {
          clientId: client.id,
          branchId: input.branchId,
          deviceId: device?.id,
          method: input.method,
          result: 'DENIED',
          denialReason: 'MEMBERSHIP_MISSING',
          message: 'No existe una membresia activa valida para este acceso.',
          openedSimulated: false,
        },
      });

      return {
        ...buildDenyPayload('MEMBERSHIP_MISSING', 'No existe una membresia activa valida para este acceso.'),
        action,
        logId: log.id,
      };
    }

    if (env.ACCESS_BLOCK_OVERDUE) {
      const overdueDebt = await accessControlRepository.findOverdueDebt(client.id);

      if (overdueDebt) {
        const action = await this.gateway.denyAccess('Acceso bloqueado por mora', input.deviceCode);
        const log = await prisma.accessLog.create({
          data: {
            clientId: client.id,
            branchId: input.branchId,
            deviceId: device?.id,
            membershipId: validMembership.id,
            method: input.method,
            result: 'DENIED',
            denialReason: 'DEBT_RESTRICTION',
            message: 'El cliente posee deuda vencida.',
            openedSimulated: false,
          },
        });

        return {
          ...buildDenyPayload('DEBT_RESTRICTION', 'El cliente posee deuda vencida.'),
          action,
          logId: log.id,
        };
      }
    }

    if (validMembership.remainingAccesses !== null && validMembership.remainingAccesses !== undefined) {
      if (validMembership.remainingAccesses <= 0) {
        const action = await this.gateway.denyAccess('Limite de accesos agotado', input.deviceCode);
        const log = await prisma.accessLog.create({
          data: {
            clientId: client.id,
            branchId: input.branchId,
            deviceId: device?.id,
            membershipId: validMembership.id,
            method: input.method,
            result: 'DENIED',
            denialReason: 'ACCESS_LIMIT_REACHED',
            message: 'El plan ya consumio todos sus accesos.',
            openedSimulated: false,
          },
        });

        return {
          ...buildDenyPayload('ACCESS_LIMIT_REACHED', 'El plan ya consumio todos sus accesos.'),
          action,
          logId: log.id,
        };
      }
    }

    const action = await this.gateway.grantAccess(input.deviceCode);
    const accessLog = await prisma.$transaction(async (tx) => {
      if (validMembership.remainingAccesses !== null && validMembership.remainingAccesses !== undefined) {
        await tx.clientMembership.update({
          where: { id: validMembership.id },
          data: {
            remainingAccesses: {
              decrement: 1,
            },
          },
        });
      }

      return tx.accessLog.create({
        data: {
          clientId: client.id,
          branchId: input.branchId,
          deviceId: device?.id,
          membershipId: validMembership.id,
          accessCredentialId:
            'accessCredentials' in client && client.accessCredentials?.length ? client.accessCredentials[0].id : null,
          method: input.method,
          result: 'ALLOWED',
          message: input.note ?? 'Acceso autorizado.',
          openedSimulated: action.simulated,
          userOverrideId: input.method === 'MANUAL_OVERRIDE' ? actor?.userId ?? null : null,
        },
      });
    });

    await auditService.record({
      userId: actor?.userId,
      branchId: input.branchId,
      action: 'ACCESS_GRANTED',
      entityName: 'AccessLog',
      entityId: accessLog.id,
      description: 'Acceso autorizado',
      metadata: {
        clientId: client.id,
        membershipId: validMembership.id,
      },
    });

    return {
      allowed: true,
      reasonCode: 'ACCESS_GRANTED',
      message: 'Acceso autorizado.',
      action,
      logId: accessLog.id,
      client: {
        id: client.id,
        memberNumber: client.memberNumber,
        firstName: client.firstName,
        lastName: client.lastName,
      },
      membership: {
        id: validMembership.id,
        endsAt: validMembership.endsAt,
        remainingAccesses: validMembership.remainingAccesses,
        planName: validMembership.plan.name,
      },
    };
  }
}

export const accessControlService = new AccessControlService();
