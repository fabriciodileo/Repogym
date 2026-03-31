import { Prisma } from '@prisma/client';

import { AppError } from '../../core/errors/app-error.js';
import { normalizePageParams } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import { auditService } from '../audit/audit.service.js';
import { reserveFormattedSequence } from '../settings/settings.service.js';
import { clientsRepository } from './clients.repository.js';

type ClientSaveInput = {
  branchId?: string;
  memberNumber?: string;
  firstName?: string;
  lastName?: string;
  dni?: string;
  birthDate?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  phone?: string;
  email?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalNotes?: string;
  photoUrl?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'OVERDUE';
  internalNotes?: string;
  administrativeBlock?: boolean;
  administrativeBlockReason?: string;
  credentials?: Array<{
    type: 'RFID_TAG' | 'QR_TOKEN' | 'EXTERNAL_CARD';
    value: string;
    isPrimary?: boolean;
    isActive?: boolean;
    notes?: string;
  }>;
};

const mapListItem = (client: Awaited<ReturnType<typeof clientsRepository.list>>[number]) => ({
  id: client.id,
  memberNumber: client.memberNumber,
  firstName: client.firstName,
  lastName: client.lastName,
  dni: client.dni,
  phone: client.phone,
  email: client.email,
  status: client.status,
  administrativeBlock: client.administrativeBlock,
  branch: client.branch,
  activeMembership: client.memberships[0]
    ? {
        id: client.memberships[0].id,
        planName: client.memberships[0].plan.name,
        endsAt: client.memberships[0].endsAt,
        status: client.memberships[0].status,
      }
    : null,
  pendingReceivables: client.receivables.length,
});

export class ClientsService {
  async list(input: { page?: number; pageSize?: number; q?: string; branchId?: string; status?: any }) {
    const pagination = normalizePageParams(input.page, input.pageSize);
    const [items, total] = await Promise.all([
      clientsRepository.list({ ...input, skip: pagination.skip, take: pagination.take }),
      clientsRepository.count(input),
    ]);

    return {
      data: items.map(mapListItem),
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
    };
  }

  async getProfile(id: string) {
    const client = await clientsRepository.findProfile(id);

    if (!client) {
      throw new AppError('Cliente no encontrado.', 404, 'CLIENT_NOT_FOUND');
    }

    return client;
  }

  async create(input: ClientSaveInput, actor: { userId: string; branchId?: string | null }) {
    const existingByDni = await clientsRepository.findByDni(input.dni!);

    if (existingByDni && !existingByDni.deletedAt) {
      throw new AppError('Ya existe un cliente con ese DNI.', 409, 'CLIENT_DNI_EXISTS');
    }

    const result = await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.findFirst({
        where: {
          id: input.branchId,
          deletedAt: null,
        },
      });

      if (!branch) {
        throw new AppError('Sucursal no encontrada.', 404, 'BRANCH_NOT_FOUND');
      }

      const memberNumber =
        input.memberNumber ??
        (await reserveFormattedSequence(tx, {
          group: 'sequence',
          key: `member_number_${branch.code.toLowerCase()}`,
          prefix: `${branch.code}-`,
          padLength: 6,
          updatedById: actor.userId,
        }));

      const existingMemberNumber = await tx.client.findUnique({
        where: { memberNumber },
      });

      if (existingMemberNumber) {
        throw new AppError('El numero de socio ya existe.', 409, 'MEMBER_NUMBER_EXISTS');
      }

      const client = await tx.client.create({
        data: {
          branchId: input.branchId!,
          memberNumber,
          firstName: input.firstName!,
          lastName: input.lastName!,
          dni: input.dni!,
          birthDate: input.birthDate,
          gender: input.gender,
          phone: input.phone,
          email: input.email?.toLowerCase(),
          address: input.address,
          emergencyContactName: input.emergencyContactName,
          emergencyContactPhone: input.emergencyContactPhone,
          medicalNotes: input.medicalNotes,
          photoUrl: input.photoUrl,
          status: input.status ?? 'ACTIVE',
          internalNotes: input.internalNotes,
          administrativeBlock: input.administrativeBlock ?? false,
          administrativeBlockReason: input.administrativeBlockReason,
          accessCredentials: input.credentials?.length
            ? {
                create: input.credentials.map((credential) => ({
                  type: credential.type,
                  value: credential.value,
                  isPrimary: credential.isPrimary ?? false,
                  isActive: credential.isActive ?? true,
                  notes: credential.notes,
                })),
              }
            : undefined,
        },
        include: {
          branch: true,
          accessCredentials: true,
        },
      });

      await auditService.record({
        userId: actor.userId,
        branchId: branch.id,
        action: 'CREATE',
        entityName: 'Client',
        entityId: client.id,
        description: 'Alta de cliente',
        metadata: {
          memberNumber: client.memberNumber,
          dni: client.dni,
        },
      });

      return client;
    });

    return result;
  }

  async update(id: string, input: ClientSaveInput, actor: { userId: string; branchId?: string | null }) {
    const existing = await clientsRepository.findById(id);

    if (!existing) {
      throw new AppError('Cliente no encontrado.', 404, 'CLIENT_NOT_FOUND');
    }

    if (input.dni && input.dni !== existing.dni) {
      const clientWithSameDni = await clientsRepository.findByDni(input.dni);
      if (clientWithSameDni && clientWithSameDni.id !== id) {
        throw new AppError('Ya existe un cliente con ese DNI.', 409, 'CLIENT_DNI_EXISTS');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (input.memberNumber && input.memberNumber !== existing.memberNumber) {
        const duplicateMember = await tx.client.findUnique({
          where: { memberNumber: input.memberNumber },
        });

        if (duplicateMember && duplicateMember.id !== id) {
          throw new AppError('El numero de socio ya existe.', 409, 'MEMBER_NUMBER_EXISTS');
        }
      }

      if (input.credentials) {
        await tx.accessCredential.deleteMany({ where: { clientId: id } });
      }

      const client = await tx.client.update({
        where: { id },
        data: {
          branchId: input.branchId,
          memberNumber: input.memberNumber,
          firstName: input.firstName,
          lastName: input.lastName,
          dni: input.dni,
          birthDate: input.birthDate,
          gender: input.gender,
          phone: input.phone,
          email: input.email?.toLowerCase(),
          address: input.address,
          emergencyContactName: input.emergencyContactName,
          emergencyContactPhone: input.emergencyContactPhone,
          medicalNotes: input.medicalNotes,
          photoUrl: input.photoUrl,
          status: input.status,
          internalNotes: input.internalNotes,
          administrativeBlock: input.administrativeBlock,
          administrativeBlockReason: input.administrativeBlockReason,
          accessCredentials: input.credentials
            ? {
                create: input.credentials.map((credential) => ({
                  type: credential.type,
                  value: credential.value,
                  isPrimary: credential.isPrimary ?? false,
                  isActive: credential.isActive ?? true,
                  notes: credential.notes,
                })),
              }
            : undefined,
        },
        include: {
          branch: true,
          accessCredentials: true,
        },
      });

      await auditService.record({
        userId: actor.userId,
        branchId: client.branchId,
        action: 'UPDATE',
        entityName: 'Client',
        entityId: client.id,
        description: 'Actualizacion de cliente',
      });

      return client;
    });

    return updated;
  }

  async softDelete(id: string, actor: { userId: string; branchId?: string | null }) {
    const existing = await clientsRepository.findById(id);

    if (!existing) {
      throw new AppError('Cliente no encontrado.', 404, 'CLIENT_NOT_FOUND');
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: client.branchId,
      action: 'SOFT_DELETE',
      entityName: 'Client',
      entityId: client.id,
      description: 'Baja logica de cliente',
    });

    return { id: client.id, deletedAt: client.deletedAt };
  }
}

export const clientsService = new ClientsService();
