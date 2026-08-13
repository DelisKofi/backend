import { Router } from 'express';
import { validateBody } from '../../middlewares/validateBody.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import {
  getExpenses,
  getExpenseDashboard,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
} from './expense.controller.js';
import { createExpenseSchema, updateExpenseSchema } from './expense.validation.js';

/**
 * @swagger
 * tags:
 *   name: Expenses
 *   description: Expense management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ExpenseCategory:
 *       type: string
 *       enum: [Electricity, Transport, Rent, Packaging, Maintenance, Wastage, Others]
 *     ExpenseSource:
 *       type: string
 *       enum: [store_till, external]
 *     CreateExpense:
 *       type: object
 *       required:
 *         - category
 *         - source
 *       properties:
 *         amount:
 *           type: number
 *           description: Expense amount (use amount or cost)
 *         cost:
 *           type: number
 *           description: Alias for amount
 *         spentAt:
 *           type: string
 *           format: date-time
 *           description: Date the expense occurred. Cannot be in the future. (use spentAt or date)
 *         date:
 *           type: string
 *           format: date-time
 *           description: Alias for spentAt
 *         category:
 *           $ref: '#/components/schemas/ExpenseCategory'
 *         description:
 *           type: string
 *         source:
 *           $ref: '#/components/schemas/ExpenseSource'
 *         branchId:
 *           type: string
 *     UpdateExpense:
 *       type: object
 *       properties:
 *         amount:
 *           type: number
 *         cost:
 *           type: number
 *         spentAt:
 *           type: string
 *           format: date-time
 *         date:
 *           type: string
 *           format: date-time
 *         category:
 *           $ref: '#/components/schemas/ExpenseCategory'
 *         description:
 *           type: string
 *         source:
 *           $ref: '#/components/schemas/ExpenseSource'
 *         branchId:
 *           type: string
 *     ExpenseResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         spentAt:
 *           type: string
 *           format: date-time
 *         category:
 *           $ref: '#/components/schemas/ExpenseCategory'
 *         description:
 *           type: string
 *         amount:
 *           type: number
 *         source:
 *           $ref: '#/components/schemas/ExpenseSource'
 *         loggedBy:
 *           type: string
 *           description: Full name of the user who logged the expense
 *         branchId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/admin/expenses:
 *   get:
 *     summary: Get all expenses (paginated, filterable)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by branch ID
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [store_till, external]
 *         description: Filter by source of funds
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Electricity, Transport, Rent, Packaging, Maintenance, Wastage, Others]
 *         description: Filter by expense category
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter expenses on or after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter expenses on or before this date
 *     responses:
 *       200:
 *         description: List of expenses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ExpenseResponse'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *   post:
 *     summary: Log a new expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateExpense'
 *     responses:
 *       201:
 *         description: Expense logged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ExpenseResponse'
 *
 * /api/v1/admin/expenses/dashboard:
 *   get:
 *     summary: Get expense totals by category (dashboard)
 *     description: Returns total amount and count per category, plus a grand total. Supports the same date and branch filters as the list endpoint.
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by branch ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Expense dashboard totals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     byCategory:
 *                       type: object
 *                       description: Map of category name to total and count
 *                       additionalProperties:
 *                         type: object
 *                         properties:
 *                           total:
 *                             type: number
 *                           count:
 *                             type: integer
 *                     grandTotal:
 *                       type: number
 *
 * /api/v1/admin/expenses/{id}:
 *   get:
 *     summary: Get an expense by ID
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ExpenseResponse'
 *       404:
 *         description: Expense not found
 *   put:
 *     summary: Update an expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateExpense'
 *     responses:
 *       200:
 *         description: Expense updated successfully
 *       404:
 *         description: Expense not found
 *   delete:
 *     summary: Soft-delete an expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense deleted successfully
 *       404:
 *         description: Expense not found
 */

const router = Router();

router.route('/')
  .get(getExpenses)
  .post(authMiddleware, validateBody(createExpenseSchema), createExpense);

router.get('/dashboard', getExpenseDashboard);

router.route('/:id')
  .get(getExpense)
  .put(validateBody(updateExpenseSchema), updateExpense)
  .delete(deleteExpense);

export default router;
