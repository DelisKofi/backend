import { Router } from 'express';
import {
  createTransfer,
  getTransfers,
  getTransfer,
  updateTransfer,
  deleteTransfer,
} from './stockTransfer.controller.js';

/**
 * @swagger
 * tags:
 *   name: Stock Transfers
 *   description: StockTransfer management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     StockTransferPackagingConfigurationSnapshot:
 *       type: object
 *       required:
 *         - packagingTypeId
 *         - packagingTypeNameSnapshot
 *         - unitsPerPackageSnapshot
 *         - containerCounts
 *         - singles
 *       properties:
 *         packagingTypeId:
 *           type: string
 *         packagingTypeNameSnapshot:
 *           type: string
 *           example: Crate
 *         unitsPerPackageSnapshot:
 *           type: integer
 *           minimum: 1
 *         containerCounts:
 *           type: array
 *           items:
 *             type: integer
 *             minimum: 0
 *         singles:
 *           type: integer
 *           minimum: 0
 *     StockTransferPackagingBreakdownSnapshot:
 *       type: object
 *       required:
 *         - configurations
 *       properties:
 *         configurations:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/StockTransferPackagingConfigurationSnapshot'
 *         displayBreakdown:
 *           type: string
 *           description: Optional preformatted string for receipts
 *     StockTransferLineItem:
 *       type: object
 *       required:
 *         - sku
 *         - name
 *         - quantity
 *       properties:
 *         productId:
 *           type: string
 *         sku:
 *           type: string
 *         name:
 *           type: string
 *         imageUrl:
 *           type: string
 *         quantity:
 *           type: integer
 *           description: Required total units for stock math
 *         packagingBreakdown:
 *           $ref: '#/components/schemas/StockTransferPackagingBreakdownSnapshot'
 *     CreateStockTransfer:
 *       type: object
 *       required:
 *         - sourceBranchId
 *         - destinationBranchId
 *         - lineItems
 *       properties:
 *         transferredAt:
 *           type: string
 *           format: date-time
 *         sourceBranchId:
 *           type: string
 *         destinationBranchId:
 *           type: string
 *         sourceBranchNameSnapshot:
 *           type: string
 *           description: Optional override; server persists immutable snapshot at creation time
 *         destinationBranchNameSnapshot:
 *           type: string
 *           description: Optional override; server persists immutable snapshot at creation time
 *         transferredByUserId:
 *           type: string
 *           description: Optional override; server defaults to authenticated user id
 *         transferredByNameSnapshot:
 *           type: string
 *           description: Optional override; server defaults to authenticated user full name
 *         lineItems:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/StockTransferLineItem'
 *         status:
 *           type: string
 *           enum: [pending, completed, cancelled]
 *     UpdateStockTransfer:
 *       type: object
 *       properties:
 *         transferredAt:
 *           type: string
 *           format: date-time
 *         sourceBranchId:
 *           type: string
 *         destinationBranchId:
 *           type: string
 *         lineItems:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/StockTransferLineItem'
 *         status:
 *           type: string
 *           enum: [pending, completed, cancelled]
 *     StockTransferResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         transferredAt:
 *           type: string
 *           format: date-time
 *         sourceBranchId:
 *           type: string
 *         sourceBranchNameSnapshot:
 *           type: string
 *         destinationBranchId:
 *           type: string
 *         destinationBranchNameSnapshot:
 *           type: string
 *         transferredBy:
 *           type: string
 *           description: Full name of the user who initiated the transfer
 *         transferredByUserId:
 *           type: string
 *           description: Immutable user id snapshot for transfer initiator
 *         transferredByNameSnapshot:
 *           type: string
 *           description: Immutable name snapshot for transfer initiator
 *         totalQuantity:
 *           type: integer
 *           description: Total number of items across all line items
 *         lineItems:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/StockTransferLineItem'
 *         status:
 *           type: string
 *           enum: [pending, completed, cancelled]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/admin/stock-transfers:
 *   get:
 *     summary: Get all stock transfers (paginated, filterable)
 *     tags: [Stock Transfers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number (enables pagination when used with limit)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, cancelled]
 *         description: Filter by transfer status
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter transfers where this branch is the source or destination
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Filter transfers from this date (inclusive). Example: 2024-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Filter transfers up to this date (inclusive). Example: 2024-12-31"
 *       - in: query
 *         name: productName
 *         schema:
 *           type: string
 *         description: Case-insensitive search for transfers containing a product by name
 *       - in: query
 *         name: transferredBy
 *         schema:
 *           type: string
 *         description: Case-insensitive search by the name or email of the person who initiated the transfer
 *     responses:
 *       200:
 *         description: List of stock transfers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StockTransferResponse'
 *                 meta:
 *                   type: object
 *                   description: Present only when page and limit are provided
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *   post:
 *     summary: Create a stock transfer
 *     description: Transfers products from a source branch to a destination branch. When status is "completed", stock levels are automatically adjusted on both branches.
 *     tags: [Stock Transfers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateStockTransfer'
 *     responses:
 *       201:
 *         description: Stock transfer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/StockTransferResponse'
 *
 * /api/v1/admin/stock-transfers/{id}:
 *   get:
 *     summary: Get a stock transfer by ID
 *     tags: [Stock Transfers]
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
 *         description: Stock transfer details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/StockTransferResponse'
 *       404:
 *         description: Stock transfer not found
 *   put:
 *     summary: Update a stock transfer
 *     tags: [Stock Transfers]
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
 *             $ref: '#/components/schemas/UpdateStockTransfer'
 *     responses:
 *       200:
 *         description: Stock transfer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/StockTransferResponse'
 *       404:
 *         description: Stock transfer not found
 *   delete:
 *     summary: Soft-delete a stock transfer
 *     tags: [Stock Transfers]
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
 *         description: Stock transfer deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   nullable: true
 *                   example: null
 *       404:
 *         description: Stock transfer not found
 */

const router = Router();

router.route('/')
  .get(getTransfers)
  .post(createTransfer);

router.route('/:id')
  .get(getTransfer)
  .put(updateTransfer)
  .delete(deleteTransfer);

export default router;
