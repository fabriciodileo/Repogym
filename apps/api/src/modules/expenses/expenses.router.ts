import { Router } from 'express';

import { asyncHandler } from '../../core/middleware/async-handler.js';
import { authenticate } from '../../core/middleware/authenticate.js';
import { authorizeRoles } from '../../core/middleware/authorize.js';
import { validate } from '../../core/middleware/validate.js';
import { expensesController } from './expenses.controller.js';
import {
  createExpenseCategorySchema,
  createExpenseSchema,
  expenseCategoriesQuerySchema,
  expenseCategoryIdParamSchema,
  expenseIdParamSchema,
  expensesListQuerySchema,
  expenseSummaryQuerySchema,
  updateExpenseCategorySchema,
  updateExpenseSchema,
} from './expenses.schemas.js';

export const expensesRouter = Router();

expensesRouter.use(authenticate);
expensesRouter.get('/', validate({ query: expensesListQuerySchema }), asyncHandler(expensesController.list));
expensesRouter.get('/summary', validate({ query: expenseSummaryQuerySchema }), asyncHandler(expensesController.summary));
expensesRouter.get('/categories', validate({ query: expenseCategoriesQuerySchema }), asyncHandler(expensesController.listCategories));
expensesRouter.post('/categories', authorizeRoles('ADMIN', 'MANAGER'), validate({ body: createExpenseCategorySchema }), asyncHandler(expensesController.createCategory));
expensesRouter.patch('/categories/:id', authorizeRoles('ADMIN', 'MANAGER'), validate({ params: expenseCategoryIdParamSchema, body: updateExpenseCategorySchema }), asyncHandler(expensesController.updateCategory));
expensesRouter.post('/', authorizeRoles('ADMIN', 'MANAGER', 'RECEPTIONIST'), validate({ body: createExpenseSchema }), asyncHandler(expensesController.create));
expensesRouter.patch('/:id', authorizeRoles('ADMIN', 'MANAGER'), validate({ params: expenseIdParamSchema, body: updateExpenseSchema }), asyncHandler(expensesController.update));
expensesRouter.delete('/:id', authorizeRoles('ADMIN', 'MANAGER'), validate({ params: expenseIdParamSchema }), asyncHandler(expensesController.remove));
