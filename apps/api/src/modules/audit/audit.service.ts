import { PrismaClient, type AuditAction } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';

type AuditInput = {
  userId?: string | null;
  branchId?: string | null;
  action: AuditAction;
  entityName: string;
  entityId?: string | null;
  description?: string;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
};

export class AuditService {
  constructor(private readonly db: PrismaClient = prisma) {}

  record(input: AuditInput) {
    return this.db.auditLog.create({
      data: {
        userId: input.userId ?? null,
        branchId: input.branchId ?? null,
        action: input.action,
        entityName: input.entityName,
        entityId: input.entityId ?? null,
        description: input.description,
        metadata: input.metadata as never,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  list(limit = 50) {
    return this.db.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }
}

export const auditService = new AuditService();
