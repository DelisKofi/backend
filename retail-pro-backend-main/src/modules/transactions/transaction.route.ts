import { Router } from 'express';
import { validateBody } from '../../middlewares/validateBody.js';
import { processTransaction, getAll, getOne, updateOne, deleteOne } from './transaction.controller.js';
import { createTransactionSchema, updateTransactionSchema } from './transaction.validation.js';

// Can inject requireBranchAccess when properly wired up with index

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Transaction management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PackagingBreakdown:
 *       type: object
 *       required:
 *         - packagingTypeId
 *         - packagingTypeName
 *         - count
 *         - unitsPerPackage
 *       properties:
 *         packagingTypeId:
 *           type: string
 *         packagingTypeName:
 *           type: string
 *         count:
 *           type: integer
 *           minimum: 0
 *         unitsPerPackage:
 *           type: integer
 *           minimum: 1
 *     TransactionPayment:
 *       type: object
 *       required:
 *         - method
 *         - amount
 *       properties:
 *         method:
 *           type: string
 *           enum: [cash, card, momo, credit]
 *         amount:
 *           type: number
 *           minimum: 0
 *     TransactionItem:
 *       type: object
 *       required:
 *         - productId
 *         - productName
 *         - quantity
 *         - unitPrice
 *         - price
 *       properties:
 *         productId:
 *           type: string
 *         productName:
 *           type: string
 *         name:
 *           type: string
 *         sku:
 *           type: string
 *         imageUrl:
 *           type: string
 *         quantity:
 *           type: integer
 *           minimum: 1
 *         price:
 *           type: number
 *         unitPrice:
 *           type: number
 *         packagingBreakdown:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PackagingBreakdown'
 *         singles:
 *           type: integer
 *           minimum: 0
 *         totalUnits:
 *           type: integer
 *           minimum: 0
 *     CreateTransaction:
 *       type: object
 *       required:
 *         - branchId
 *         - items
 *         - payments
 *       properties:
 *         customerId:
 *           type: string
 *           nullable: true
 *         branchId:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [completed, pending, cancelled, draft, voided]
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TransactionItem'
 *         payments:
 *           type: array
 *           minItems: 1
 *           items:
 *             $ref: '#/components/schemas/TransactionPayment'
 *         taxRate:
 *           type: number
 *         tax:
 *           type: number
 *         subtotal:
 *           type: number
 *         amount:
 *           type: number
 *         idempotencyKey:
 *           type: string
 *     UpdateTransaction:
 *       type: object
 *       properties:
 *         customerId:
 *           type: string
 *           nullable: true
 *         branchId:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [completed, pending, cancelled, draft, voided]
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TransactionItem'
 *         payments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TransactionPayment'
 *         paymentMethod:
 *           type: string
 *           enum: [cash, card, momo, credit, split]
 *         amountReceived:
 *           type: number
 *         taxRate:
 *           type: number
 *         tax:
 *           type: number
 *         subtotal:
 *           type: number
 *         amount:
 *           type: number
 *         idempotencyKey:
 *           type: string
 *
 *     TransactionRecord:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         customerId:
 *           type: string
 *           nullable: true
 *         branchId:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *         amount:
 *           type: number
 *         subtotal:
 *           type: number
 *         tax:
 *           type: number
 *         taxRate:
 *           type: number
 *         paymentMethod:
 *           type: string
 *           enum: [cash, card, momo, credit, split]
 *         amountReceived:
 *           type: number
 *         payments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TransactionPayment'
 *         linkedReceivableId:
 *           type: string
 *           nullable: true
 *         idempotencyKey:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [completed, pending, cancelled, draft, voided]
 *         createdBy:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TransactionItem'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     TransactionListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TransactionRecord'
 *         meta:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *
 *     TransactionItemResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           $ref: '#/components/schemas/TransactionRecord'
 */

/**
 * @swagger
 * /api/v1/admin/transactions:
 *   get:
 *     summary: Get all transactions
 *     tags: [Transactions]
 *     description: Transaction list responses always include payments[] and derived payment fields. POS credit sales automatically create a receivable; the frontend does not need a separate POST /debts-credits call.
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO start date to filter transactions (inclusive)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO end date to filter transactions (inclusive)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter transactions created by this user id (createdBy)
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by branch id
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Transaction status
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionListResponse'
 *   post:
 *     summary: Create a new transaction
 *     tags: [Transactions]
 *     description: Create a single sale with split payments. If any payment line uses credit, customerId is required and the backend creates the receivable automatically in the same database transaction.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema:
 *           type: string
 *         description: Optional client-generated UUID to prevent duplicate checkout writes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTransaction'
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/TransactionRecord'
 *
 * /api/v1/admin/transactions/{id}:
 *   get:
 *     summary: Get a transaction by ID
 *     tags: [Transactions]
 *     description: Response includes payments[] and derived paymentMethod / amountReceived fields.
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
 *         description: Transaction details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionItemResponse'
 *   put:
 *     summary: Update a transaction
 *     tags: [Transactions]
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
 *             $ref: '#/components/schemas/UpdateTransaction'
 *     responses:
 *       200:
 *         description: Transaction updated successfully
 *   delete:
 *     summary: Delete a transaction
 *     tags: [Transactions]
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
 *         description: Transaction deleted successfully
 */

const router = Router();

router.route('/')
  .get(getAll)
  .post(validateBody(createTransactionSchema), processTransaction);

router.route('/:id')
  .get(getOne)
  .put(validateBody(updateTransactionSchema), updateOne)
  .delete(deleteOne);

export default router;
