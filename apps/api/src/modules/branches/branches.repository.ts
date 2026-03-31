import type { PrismaClient} from '@prisma/client';
import { type Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';

export class BranchesRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  list() {
    return this.db.branch.findMany({
      where: { deletedAt: null },
      include: {
        operatingHours: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.db.branch.findFirst({
      where: { id, deletedAt: null },
      include: {
        operatingHours: true,
      },
    });
  }

  findByCode(code: string) {
    return this.db.branch.findUnique({
      where: { code },
    });
  }

  create(data: Prisma.BranchCreateInput) {
    return this.db.branch.create({
      data,
      include: {
        operatingHours: true,
      },
    });
  }

  update(id: string, data: Prisma.BranchUpdateInput) {
    return this.db.branch.update({
      where: { id },
      data,
      include: {
        operatingHours: true,
      },
    });
  }
}

export const branchesRepository = new BranchesRepository();
