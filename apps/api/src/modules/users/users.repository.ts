import { PrismaClient, type Prisma, type RoleCode } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';

const buildWhere = (filters: {
  q?: string;
  roleCode?: RoleCode;
  isActive?: boolean;
}): Prisma.UserWhereInput => ({
  deletedAt: null,
  role: filters.roleCode
    ? {
        code: filters.roleCode,
      }
    : undefined,
  isActive: filters.isActive,
  OR: filters.q
    ? [
        { firstName: { contains: filters.q, mode: 'insensitive' } },
        { lastName: { contains: filters.q, mode: 'insensitive' } },
        { email: { contains: filters.q, mode: 'insensitive' } },
      ]
    : undefined,
});

export class UsersRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  list(filters: { q?: string; roleCode?: RoleCode; isActive?: boolean; skip: number; take: number }) {
    return this.db.user.findMany({
      where: buildWhere(filters),
      skip: filters.skip,
      take: filters.take,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        role: true,
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

  count(filters: { q?: string; roleCode?: RoleCode; isActive?: boolean }) {
    return this.db.user.count({
      where: buildWhere(filters),
    });
  }

  findById(id: string) {
    return this.db.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        role: true,
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

  findByEmail(email: string) {
    return this.db.user.findFirst({
      where: {
        email: email.toLowerCase(),
      },
    });
  }

  findRoleByCode(roleCode: RoleCode) {
    return this.db.role.findUnique({
      where: {
        code: roleCode,
      },
    });
  }

  listRoles() {
    return this.db.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  create(data: Prisma.UserUncheckedCreateInput) {
    return this.db.user.create({
      data,
      include: {
        role: true,
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

  update(id: string, data: Prisma.UserUncheckedUpdateInput) {
    return this.db.user.update({
      where: { id },
      data,
      include: {
        role: true,
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

export const usersRepository = new UsersRepository();
