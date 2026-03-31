import type { RoleCode } from '@prisma/client';

import { AppError } from '../../core/errors/app-error.js';
import { hashPassword } from '../../lib/password.js';
import { normalizePageParams } from '../../lib/pagination.js';
import { auditService } from '../audit/audit.service.js';
import { usersRepository } from './users.repository.js';

type ListInput = {
  page?: number;
  pageSize?: number;
  q?: string;
  roleCode?: RoleCode;
  isActive?: boolean;
};

type SaveInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  roleCode?: RoleCode;
  branchId?: string | null;
  isActive?: boolean;
};

const mapUser = (user: NonNullable<Awaited<ReturnType<typeof usersRepository.findById>>>) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  isActive: user.isActive,
  lastAccessAt: user.lastAccessAt,
  role: user.role,
  branch: user.branch,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export class UsersService {
  async list(input: ListInput) {
    const pagination = normalizePageParams(input.page, input.pageSize);
    const [items, total] = await Promise.all([
      usersRepository.list({ ...input, skip: pagination.skip, take: pagination.take }),
      usersRepository.count(input),
    ]);

    return {
      data: items.map(mapUser),
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
    };
  }

  async listRoles() {
    const roles = await usersRepository.listRoles();
    return roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      permissions: role.rolePermissions.map((item) => ({
        code: item.permission.code,
        name: item.permission.name,
      })),
    }));
  }

  async create(input: SaveInput, actor: { userId: string; branchId?: string | null }) {
    const existing = await usersRepository.findByEmail(input.email!);

    if (existing) {
      throw new AppError('Ya existe un usuario con ese email.', 409, 'EMAIL_ALREADY_EXISTS');
    }

    const role = await usersRepository.findRoleByCode(input.roleCode!);

    if (!role) {
      throw new AppError('El rol indicado no existe.', 404, 'ROLE_NOT_FOUND');
    }

    const user = await usersRepository.create({
      firstName: input.firstName!,
      lastName: input.lastName!,
      email: input.email!.toLowerCase(),
      passwordHash: await hashPassword(input.password!),
      roleId: role.id,
      branchId: input.branchId ?? null,
      isActive: input.isActive ?? true,
    });

    await auditService.record({
      userId: actor.userId,
      branchId: actor.branchId,
      action: 'CREATE',
      entityName: 'User',
      entityId: user.id,
      description: 'Alta de usuario interno',
      metadata: {
        email: user.email,
        roleCode: role.code,
      },
    });

    return mapUser(user);
  }

  async update(id: string, input: SaveInput, actor: { userId: string; branchId?: string | null }) {
    const existing = await usersRepository.findById(id);

    if (!existing) {
      throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND');
    }

    const nextRole = input.roleCode ? await usersRepository.findRoleByCode(input.roleCode) : null;

    if (input.roleCode && !nextRole) {
      throw new AppError('El rol indicado no existe.', 404, 'ROLE_NOT_FOUND');
    }

    const user = await usersRepository.update(id, {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email?.toLowerCase(),
      passwordHash: input.password ? await hashPassword(input.password) : undefined,
      roleId: nextRole?.id,
      branchId: input.branchId,
      isActive: input.isActive,
    });

    await auditService.record({
      userId: actor.userId,
      branchId: actor.branchId,
      action: input.roleCode && input.roleCode !== existing.role.code ? 'ROLE_CHANGED' : 'UPDATE',
      entityName: 'User',
      entityId: user.id,
      description: 'Actualizacion de usuario interno',
      metadata: {
        roleBefore: existing.role.code,
        roleAfter: user.role.code,
      },
    });

    return mapUser(user);
  }
}

export const usersService = new UsersService();
