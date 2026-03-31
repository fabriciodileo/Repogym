import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../core/middleware/authorize.js';
import { validate } from '../../core/middleware/validate.js';
import { productsController } from './products.controller.js';
import {
  createProductCategorySchema,
  createProductSaleSchema,
  createProductSchema,
  createStockMovementSchema,
  productCategoryIdParamSchema,
  productIdParamSchema,
  productsListQuerySchema,
  stockMovementsListQuerySchema,
  updateProductCategorySchema,
  updateProductSchema,
} from './products.schemas.js';

export const productsRouter = Router();

productsRouter.use(authenticate);
productsRouter.get('/', validate({ query: productsListQuerySchema }), asyncHandler(productsController.list));
productsRouter.get('/categories', asyncHandler(productsController.listCategories));
productsRouter.post('/categories', authorizeRoles('ADMIN', 'MANAGER'), validate({ body: createProductCategorySchema }), asyncHandler(productsController.createCategory));
productsRouter.patch('/categories/:id', authorizeRoles('ADMIN', 'MANAGER'), validate({ params: productCategoryIdParamSchema, body: updateProductCategorySchema }), asyncHandler(productsController.updateCategory));
productsRouter.post('/', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ body: createProductSchema }), asyncHandler(productsController.create));
productsRouter.patch('/:id', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ params: productIdParamSchema, body: updateProductSchema }), asyncHandler(productsController.update));
productsRouter.delete('/:id', authorizeRoles('ADMIN', 'MANAGER'), validate({ params: productIdParamSchema }), asyncHandler(productsController.remove));
productsRouter.get('/stock-movements', validate({ query: stockMovementsListQuerySchema }), asyncHandler(productsController.listStockMovements));
productsRouter.post('/stock-movements', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ body: createStockMovementSchema }), asyncHandler(productsController.createStockMovement));
productsRouter.post('/sales', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ body: createProductSaleSchema }), asyncHandler(productsController.createSale));
