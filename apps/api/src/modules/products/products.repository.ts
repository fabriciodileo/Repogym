import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';

const buildProductWhere = (filters: {
  branchId?: string;
  categoryId?: string;
  status?: string;
  lowStockOnly?: boolean;
  q?: string;
}): Prisma.ProductWhereInput => ({
  deletedAt: null,
  branchId: filters.branchId,
  categoryId: filters.categoryId,
  status: filters.status as never,
  OR: filters.q
    ? [
        { code: { contains: filters.q, mode: 'insensitive' } },
        { name: { contains: filters.q, mode: 'insensitive' } },
        { supplier: { contains: filters.q, mode: 'insensitive' } },
      ]
    : undefined,
});

export class ProductsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  list(filters: {
    branchId?: string;
    categoryId?: string;
    status?: string;
    lowStockOnly?: boolean;
    q?: string;
    skip: number;
    take: number;
  }) {
    return this.db.product.findMany({
      where: buildProductWhere(filters),
      skip: filters.skip,
      take: filters.take,
      include: {
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        category: true,
      },
      orderBy: [{ stock: 'asc' }, { name: 'asc' }],
    });
  }

  count(filters: {
    branchId?: string;
    categoryId?: string;
    status?: string;
    lowStockOnly?: boolean;
    q?: string;
  }) {
    return this.db.product.count({ where: buildProductWhere(filters) });
  }

  findById(id: string) {
    return this.db.product.findUnique({
      where: { id },
      include: {
        branch: true,
        category: true,
      },
    });
  }

  findByCode(code: string) {
    return this.db.product.findUnique({ where: { code } });
  }

  listCategories() {
    return this.db.productCategory.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    });
  }

  findCategoryById(id: string) {
    return this.db.productCategory.findUnique({ where: { id } });
  }

  findCategoryByCode(code: string) {
    return this.db.productCategory.findUnique({ where: { code } });
  }

  listStockMovements(filters: { productId?: string; branchId?: string; skip: number; take: number }) {
    return this.db.stockMovement.findMany({
      where: {
        productId: filters.productId,
        branchId: filters.branchId,
      },
      skip: filters.skip,
      take: filters.take,
      include: {
        product: true,
        branch: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        sale: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  countStockMovements(filters: { productId?: string; branchId?: string }) {
    return this.db.stockMovement.count({
      where: {
        productId: filters.productId,
        branchId: filters.branchId,
      },
    });
  }
}

export const productsRepository = new ProductsRepository();
