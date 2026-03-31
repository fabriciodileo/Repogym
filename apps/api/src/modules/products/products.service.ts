import { Prisma } from '@prisma/client';

import { AppError } from '../../core/errors/app-error.js';
import { calculateNetAmount } from '../../lib/finance.js';
import { normalizePageParams } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import { auditService } from '../audit/audit.service.js';
import { notificationsService } from '../notifications/notifications.service.js';
import { reserveFormattedSequence } from '../settings/settings.service.js';
import { productsRepository } from './products.repository.js';

type Actor = {
  userId: string;
  branchId?: string | null;
};

type ProductCategoryInput = {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
};

type ProductInput = {
  branchId?: string;
  categoryId?: string;
  code?: string;
  name?: string;
  description?: string;
  stock?: number;
  minStock?: number;
  costPrice?: number;
  salePrice?: number;
  supplier?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
};

type StockMovementInput = {
  productId?: string;
  branchId?: string;
  type?: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'LOSS' | 'RETURN' | 'INITIAL';
  quantity?: number;
  reason?: string;
};

type ProductSaleInput = {
  branchId?: string;
  clientId?: string;
  items?: Array<{ productId: string; quantity: number }>;
  discountAmount?: number;
  surchargeAmount?: number;
  notes?: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'DIGITAL_WALLET' | 'OTHER';
  paymentReference?: string;
};

const resolveSignedQuantity = (type: string, quantity: number) => {
  if (type === 'SALE' || type === 'LOSS') {
    return quantity > 0 ? quantity * -1 : quantity;
  }

  if (type === 'PURCHASE' || type === 'RETURN' || type === 'INITIAL') {
    return quantity < 0 ? Math.abs(quantity) : quantity;
  }

  return quantity;
};

export class ProductsService {
  async list(input: {
    page?: number;
    pageSize?: number;
    branchId?: string;
    categoryId?: string;
    status?: string;
    lowStockOnly?: boolean;
    q?: string;
  }) {
    const pagination = normalizePageParams(input.page, input.pageSize);
    const [items, total, categories] = await Promise.all([
      productsRepository.list({ ...input, skip: pagination.skip, take: pagination.take }),
      productsRepository.count(input),
      productsRepository.listCategories(),
    ]);

    const data = input.lowStockOnly ? items.filter((product) => product.stock <= product.minStock) : items;

    return {
      data,
      categories,
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: input.lowStockOnly ? data.length : total,
      },
    };
  }

  listCategories() {
    return productsRepository.listCategories();
  }

  async listStockMovements(input: { productId?: string; branchId?: string; page?: number; pageSize?: number }) {
    const pagination = normalizePageParams(input.page, input.pageSize);
    const [items, total] = await Promise.all([
      productsRepository.listStockMovements({ ...input, skip: pagination.skip, take: pagination.take }),
      productsRepository.countStockMovements(input),
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

  async createCategory(input: ProductCategoryInput, actor: Actor) {
    const duplicate = await productsRepository.findCategoryByCode(input.code!);
    if (duplicate && !duplicate.deletedAt) {
      throw new AppError('Ya existe una categoria de producto con ese codigo.', 409, 'PRODUCT_CATEGORY_EXISTS');
    }

    const category = await prisma.productCategory.create({
      data: {
        code: input.code!,
        name: input.name!,
        description: input.description,
        isActive: input.isActive ?? true,
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: actor.branchId,
      action: 'CREATE',
      entityName: 'ProductCategory',
      entityId: category.id,
      description: 'Alta de categoria de producto',
    });

    return category;
  }

  async updateCategory(id: string, input: ProductCategoryInput, actor: Actor) {
    const existing = await productsRepository.findCategoryById(id);
    if (!existing || existing.deletedAt) {
      throw new AppError('Categoria de producto no encontrada.', 404, 'PRODUCT_CATEGORY_NOT_FOUND');
    }

    if (input.code && input.code !== existing.code) {
      const duplicate = await productsRepository.findCategoryByCode(input.code);
      if (duplicate && duplicate.id !== id && !duplicate.deletedAt) {
        throw new AppError('Ya existe una categoria de producto con ese codigo.', 409, 'PRODUCT_CATEGORY_EXISTS');
      }
    }

    const category = await prisma.productCategory.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        isActive: input.isActive,
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: actor.branchId,
      action: 'UPDATE',
      entityName: 'ProductCategory',
      entityId: category.id,
      description: 'Actualizacion de categoria de producto',
    });

    return category;
  }

  async create(input: ProductInput, actor: Actor) {
    const category = await productsRepository.findCategoryById(input.categoryId!);
    if (!category || category.deletedAt || !category.isActive) {
      throw new AppError('Categoria de producto no encontrada o inactiva.', 404, 'PRODUCT_CATEGORY_NOT_FOUND');
    }

    const duplicate = await productsRepository.findByCode(input.code!);
    if (duplicate && !duplicate.deletedAt) {
      throw new AppError('Ya existe un producto con ese codigo.', 409, 'PRODUCT_CODE_EXISTS');
    }

    const branch = input.branchId
      ? await prisma.branch.findFirst({ where: { id: input.branchId, deletedAt: null } })
      : null;

    if (input.branchId && !branch) {
      throw new AppError('Sucursal no encontrada.', 404, 'BRANCH_NOT_FOUND');
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          branchId: input.branchId ?? null,
          categoryId: input.categoryId!,
          code: input.code!,
          name: input.name!,
          description: input.description,
          stock: input.stock ?? 0,
          minStock: input.minStock!,
          costPrice: new Prisma.Decimal(input.costPrice!),
          salePrice: new Prisma.Decimal(input.salePrice!),
          supplier: input.supplier,
          status: input.status ?? 'ACTIVE',
        },
      });

      if ((input.stock ?? 0) > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            branchId: created.branchId,
            type: 'INITIAL',
            quantity: input.stock ?? 0,
            previousStock: 0,
            newStock: input.stock ?? 0,
            reason: 'Stock inicial del producto',
            createdById: actor.userId,
          },
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          branch: true,
          category: true,
        },
      });
    });

    await auditService.record({
      userId: actor.userId,
      branchId: product.branchId,
      action: 'PRODUCT_UPDATED',
      entityName: 'Product',
      entityId: product.id,
      description: 'Alta de producto',
      metadata: {
        code: product.code,
      },
    });

    return product;
  }

  async update(id: string, input: ProductInput, actor: Actor) {
    const existing = await productsRepository.findById(id);
    if (!existing || existing.deletedAt) {
      throw new AppError('Producto no encontrado.', 404, 'PRODUCT_NOT_FOUND');
    }

    if (input.code && input.code !== existing.code) {
      const duplicate = await productsRepository.findByCode(input.code);
      if (duplicate && duplicate.id !== id && !duplicate.deletedAt) {
        throw new AppError('Ya existe un producto con ese codigo.', 409, 'PRODUCT_CODE_EXISTS');
      }
    }

    if (input.categoryId) {
      const category = await productsRepository.findCategoryById(input.categoryId);
      if (!category || category.deletedAt || !category.isActive) {
        throw new AppError('Categoria de producto no encontrada o inactiva.', 404, 'PRODUCT_CATEGORY_NOT_FOUND');
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        branchId: input.branchId,
        categoryId: input.categoryId,
        code: input.code,
        name: input.name,
        description: input.description,
        minStock: input.minStock,
        costPrice: input.costPrice !== undefined ? new Prisma.Decimal(input.costPrice) : undefined,
        salePrice: input.salePrice !== undefined ? new Prisma.Decimal(input.salePrice) : undefined,
        supplier: input.supplier,
        status: input.status,
      },
      include: {
        branch: true,
        category: true,
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: product.branchId,
      action: 'PRODUCT_UPDATED',
      entityName: 'Product',
      entityId: product.id,
      description: 'Actualizacion de producto',
    });

    return product;
  }

  async remove(id: string, actor: Actor) {
    const existing = await productsRepository.findById(id);
    if (!existing || existing.deletedAt) {
      throw new AppError('Producto no encontrado.', 404, 'PRODUCT_NOT_FOUND');
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        status: 'DISCONTINUED',
        deletedAt: new Date(),
      },
    });

    await auditService.record({
      userId: actor.userId,
      branchId: existing.branchId,
      action: 'SOFT_DELETE',
      entityName: 'Product',
      entityId: product.id,
      description: 'Baja logica de producto',
    });

    return product;
  }

  async recordStockMovement(input: StockMovementInput, actor: Actor) {
    const movement = await prisma.$transaction(async (tx) => {
      return this.applyStockMutation(tx, {
        productId: input.productId!,
        branchId: input.branchId,
        type: input.type!,
        quantity: input.quantity!,
        reason: input.reason,
        createdById: actor.userId,
      });
    });

    await auditService.record({
      userId: actor.userId,
      branchId: movement.branchId,
      action: 'STOCK_MOVEMENT_RECORDED',
      entityName: 'StockMovement',
      entityId: movement.id,
      description: `Movimiento de stock ${movement.type}`,
      metadata: {
        quantity: movement.quantity,
        productId: movement.productId,
      },
    });

    const product = await productsRepository.findById(movement.productId);
    if (product && product.stock <= product.minStock) {
      await notificationsService.queueLowStock({
        branchId: product.branchId,
        productId: product.id,
        title: `Stock bajo: ${product.name}`,
        body: `El producto ${product.name} quedo con stock ${product.stock} y minimo ${product.minStock}.`,
        context: {
          stock: product.stock,
          minStock: product.minStock,
        },
      });
    }

    return movement;
  }

  async createSale(input: ProductSaleInput, actor: Actor) {
    const branch = await prisma.branch.findFirst({ where: { id: input.branchId, deletedAt: null } });
    if (!branch) {
      throw new AppError('Sucursal no encontrada.', 404, 'BRANCH_NOT_FOUND');
    }

    const sale = await prisma.$transaction(async (tx) => {
      const preparedItems: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }> = [];

      for (const item of input.items ?? []) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.deletedAt || product.status !== 'ACTIVE') {
          throw new AppError('Producto no encontrado o inactivo para la venta.', 404, 'PRODUCT_NOT_FOUND');
        }

        preparedItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: Number(product.salePrice),
          totalPrice: Number(product.salePrice) * item.quantity,
        });
      }

      const subtotal = preparedItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const totalAmount = calculateNetAmount(subtotal, input.discountAmount ?? 0, input.surchargeAmount ?? 0);

      const createdSale = await tx.productSale.create({
        data: {
          branchId: branch.id,
          clientId: input.clientId ?? null,
          soldById: actor.userId,
          subtotal: new Prisma.Decimal(subtotal),
          discountAmount: new Prisma.Decimal(input.discountAmount ?? 0),
          surchargeAmount: new Prisma.Decimal(input.surchargeAmount ?? 0),
          totalAmount: new Prisma.Decimal(totalAmount),
          notes: input.notes,
          items: {
            create: preparedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              totalPrice: new Prisma.Decimal(item.totalPrice),
            })),
          },
        },
      });

      for (const item of preparedItems) {
        await this.applyStockMutation(tx, {
          productId: item.productId,
          branchId: branch.id,
          saleId: createdSale.id,
          type: 'SALE',
          quantity: item.quantity,
          reason: `Venta interna ${createdSale.id}`,
          createdById: actor.userId,
        });
      }

      if (input.clientId) {
        const receivable = await tx.receivable.create({
          data: {
            clientId: input.clientId,
            branchId: branch.id,
            saleId: createdSale.id,
            type: 'PRODUCT_SALE',
            description: `Venta interna ${createdSale.id}`,
            originalAmount: new Prisma.Decimal(subtotal),
            discountAmount: new Prisma.Decimal(input.discountAmount ?? 0),
            surchargeAmount: new Prisma.Decimal(input.surchargeAmount ?? 0),
            balanceAmount: new Prisma.Decimal(totalAmount),
            dueDate: new Date(),
            status: input.paymentMethod ? 'PAID' : 'OPEN',
            settledAt: input.paymentMethod ? new Date() : null,
          },
        });

        if (input.paymentMethod) {
          const receiptNumber = await reserveFormattedSequence(tx, {
            group: 'sequence',
            key: 'receipt_number',
            prefix: 'REC-',
            padLength: 8,
            updatedById: actor.userId,
          });

          const payment = await tx.payment.create({
            data: {
              clientId: input.clientId,
              branchId: branch.id,
              concept: `Venta productos ${createdSale.id}`,
              grossAmount: new Prisma.Decimal(subtotal),
              discountAmount: new Prisma.Decimal(input.discountAmount ?? 0),
              surchargeAmount: new Prisma.Decimal(input.surchargeAmount ?? 0),
              finalAmount: new Prisma.Decimal(totalAmount),
              method: input.paymentMethod,
              reference: input.paymentReference,
              receiptNumber,
              registeredById: actor.userId,
              allocations: {
                create: {
                  receivableId: receivable.id,
                  amount: new Prisma.Decimal(totalAmount),
                },
              },
            },
          });

          await tx.receivable.update({
            where: { id: receivable.id },
            data: {
              balanceAmount: new Prisma.Decimal(0),
              status: 'PAID',
              settledAt: new Date(),
            },
          });

          if (input.paymentMethod === 'CASH') {
            const openCashSession = await tx.cashSession.findFirst({
              where: {
                branchId: branch.id,
                status: 'OPEN',
              },
              orderBy: { openedAt: 'desc' },
            });

            if (openCashSession) {
              await tx.cashMovement.create({
                data: {
                  cashSessionId: openCashSession.id,
                  branchId: branch.id,
                  paymentId: payment.id,
                  type: 'INCOME',
                  amount: new Prisma.Decimal(totalAmount),
                  method: 'CASH',
                  description: `Venta productos ${createdSale.id}`,
                  createdById: actor.userId,
                },
              });
            }
          }
        }
      } else if (input.paymentMethod) {
        const receiptNumber = await reserveFormattedSequence(tx, {
          group: 'sequence',
          key: 'receipt_number',
          prefix: 'REC-',
          padLength: 8,
          updatedById: actor.userId,
        });

        const payment = await tx.payment.create({
          data: {
            clientId: null,
            branchId: branch.id,
            concept: `Venta productos ${createdSale.id}`,
            grossAmount: new Prisma.Decimal(subtotal),
            discountAmount: new Prisma.Decimal(input.discountAmount ?? 0),
            surchargeAmount: new Prisma.Decimal(input.surchargeAmount ?? 0),
            finalAmount: new Prisma.Decimal(totalAmount),
            method: input.paymentMethod,
            reference: input.paymentReference,
            receiptNumber,
            registeredById: actor.userId,
          },
        });

        if (input.paymentMethod === 'CASH') {
          const openCashSession = await tx.cashSession.findFirst({
            where: {
              branchId: branch.id,
              status: 'OPEN',
            },
            orderBy: { openedAt: 'desc' },
          });

          if (openCashSession) {
            await tx.cashMovement.create({
              data: {
                cashSessionId: openCashSession.id,
                branchId: branch.id,
                paymentId: payment.id,
                type: 'INCOME',
                amount: new Prisma.Decimal(totalAmount),
                method: 'CASH',
                description: `Venta productos ${createdSale.id}`,
                createdById: actor.userId,
              },
            });
          }
        }
      }

      return tx.productSale.findUniqueOrThrow({
        where: { id: createdSale.id },
        include: {
          branch: true,
          client: true,
          soldBy: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    await auditService.record({
      userId: actor.userId,
      branchId: sale.branchId,
      action: 'CREATE',
      entityName: 'ProductSale',
      entityId: sale.id,
      description: 'Registro de venta interna de productos',
      metadata: {
        totalAmount: sale.totalAmount,
        items: sale.items.length,
      },
    });

    return sale;
  }

  private async applyStockMutation(
    tx: Prisma.TransactionClient,
    input: {
      productId: string;
      branchId?: string | null;
      saleId?: string;
      type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'LOSS' | 'RETURN' | 'INITIAL';
      quantity: number;
      reason?: string;
      createdById: string;
    },
  ) {
    const product = await tx.product.findUnique({ where: { id: input.productId } });
    if (!product || product.deletedAt) {
      throw new AppError('Producto no encontrado.', 404, 'PRODUCT_NOT_FOUND');
    }

    const signedQuantity = resolveSignedQuantity(input.type, input.quantity);
    const nextStock = product.stock + signedQuantity;

    if (nextStock < 0) {
      throw new AppError(`Stock insuficiente para ${product.name}.`, 409, 'INSUFFICIENT_STOCK');
    }

    const updatedProduct = await tx.product.updateMany({
      where: {
        id: product.id,
        stock: product.stock,
      },
      data: {
        stock: nextStock,
      },
    });

    if (!updatedProduct.count) {
      throw new AppError('No se pudo actualizar el stock por una modificacion concurrente. Reintenta.', 409, 'STOCK_CONFLICT');
    }

    return tx.stockMovement.create({
      data: {
        productId: product.id,
        branchId: input.branchId ?? product.branchId,
        saleId: input.saleId ?? null,
        type: input.type,
        quantity: signedQuantity,
        previousStock: product.stock,
        newStock: nextStock,
        reason: input.reason,
        createdById: input.createdById,
      },
      include: {
        product: true,
        branch: true,
        createdBy: true,
        sale: true,
      },
    });
  }
}

export const productsService = new ProductsService();
