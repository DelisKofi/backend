import { Router } from 'express';
import { validateBody } from '../../middlewares/validateBody.js';
import {
  listReconciliations,
  getReconciliationByDate,
  getReconciliation,
  startEod,
  closeReconciliation,
  reopenReconciliation,
} from './reconciliation.controller.js';
import { closeSchema, startEodSchema } from './reconciliation.validation.js';

/**
 * @swagger
 * tags:
 *   name: Reconciliations
 *   description: End of day sales reconciliation and daily closings
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ReconciliationStatus:
 *       type: string
 *       enum: [Open, Closed]
 *     PaymentBreakdownLine:
 *       type: object
 *       properties:
 *         key:
 *           type: string
 *           enum: [cash, card, momo, credit]
 *         label:
 *           type: string
 *         expected:
 *           type: number
 *         actual:
 *           type: number
 *           nullable: true
 *     ReconciliationListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: UUID or pending:{branchId}:{YYYY-MM-DD} for unmaterialized days
 *         date:
 *           type: string
 *           format: date
 *           example: "2026-03-12"
 *         status:
 *           $ref: '#/components/schemas/ReconciliationStatus'
 *         totalSales:
 *           type: number
 *         variance:
 *           type: number
 *           nullable: true
 *           description: Cash variance (actualCash - expectedCash); null when Open
 *     InventoryImpact:
 *       type: object
 *       properties:
 *         totalRecords:
 *           type: integer
 *         totalItemsLoss:
 *           type: number
 *         financialLoss:
 *           type: number
 *         topCause:
 *           type: string
 *     DebtImpact:
 *       type: object
 *       properties:
 *         newReceivables:
 *           type: number
 *         debtCollections:
 *           type: number
 *     UserSalesSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         transactions:
 *           type: integer
 *         totalSales:
 *           type: number
 *         cash:
 *           type: number
 *         card:
 *           type: number
 *         momo:
 *           type: number
 *         credit:
 *           type: number
 *     ReconciliationDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         date:
 *           type: string
 *           format: date
 *         branchId:
 *           type: string
 *         status:
 *           $ref: '#/components/schemas/ReconciliationStatus'
 *         totalSales:
 *           type: number
 *         cashSales:
 *           type: number
 *         digitalSales:
 *           type: number
 *         creditSales:
 *           type: number
 *         expectedCash:
 *           type: number
 *         actualCash:
 *           type: number
 *           nullable: true
 *         variance:
 *           type: number
 *           nullable: true
 *         notes:
 *           type: string
 *           nullable: true
 *         paymentBreakdown:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PaymentBreakdownLine'
 *         inventoryImpact:
 *           $ref: '#/components/schemas/InventoryImpact'
 *         debtImpact:
 *           $ref: '#/components/schemas/DebtImpact'
 *         userSales:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserSalesSummary'
 *         snapshotAt:
 *           type: string
 *           format: date-time
 *           description: Present when early EOD was started; transactions after this time are excluded from expected totals
 *         closedAt:
 *           type: string
 *           format: date-time
 *         closedBy:
 *           type: string
 *     CloseActualAmounts:
 *       type: object
 *       required: [cash, card, momo]
 *       properties:
 *         cash:
 *           type: number
 *           minimum: 0
 *         card:
 *           type: number
 *           minimum: 0
 *         momo:
 *           type: number
 *           minimum: 0
 *     CloseReconciliationBody:
 *       type: object
 *       required: [actualAmounts]
 *       properties:
 *         actualAmounts:
 *           $ref: '#/components/schemas/CloseActualAmounts'
 *         notes:
 *           type: string
 *           description: Required when cash variance is not zero
 *     StartEodBody:
 *       type: object
 *       required: [branchId]
 *       properties:
 *         branchId:
 *           type: string
 *         date:
 *           type: string
 *           format: date
 *           description: Business day (YYYY-MM-DD). Defaults to today (UTC) if omitted.
 *     ReconciliationListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ReconciliationListItem'
 *         meta:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *     ReconciliationDetailResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           $ref: '#/components/schemas/ReconciliationDetail'
 */

const router = Router();

/**
 * @swagger
 * /api/v1/admin/reconciliations:
 *   get:
 *     summary: List daily closings (includes virtual Open days with sales but no record yet)
 *     tags: [Reconciliations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-03-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/ReconciliationStatus'
 *       - in: query
 *         name: hasVariance
 *         schema:
 *           type: boolean
 *         description: When true, returns only Closed days where cash variance is non-zero
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Daily closings list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReconciliationListResponse'
 */
router.get('/', listReconciliations);

/**
 * @swagger
 * /api/v1/admin/reconciliations/by-date:
 *   get:
 *     summary: Get reconciliation detail by branch and business date
 *     tags: [Reconciliations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Reconciliation detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReconciliationDetailResponse'
 */
router.get('/by-date', getReconciliationByDate);

/**
 * @swagger
 * /api/v1/admin/reconciliations/start-eod:
 *   post:
 *     summary: Start early EOD closing (snapshots expected totals at this moment)
 *     tags: [Reconciliations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StartEodBody'
 *     responses:
 *       201:
 *         description: Open reconciliation created with snapshot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReconciliationDetailResponse'
 *       409:
 *         description: Reconciliation already exists for branch and date
 */
router.post('/start-eod', validateBody(startEodSchema), startEod);

/**
 * @swagger
 * /api/v1/admin/reconciliations/{id}:
 *   get:
 *     summary: Get reconciliation detail by id (or pending:{branchId}:{date})
 *     tags: [Reconciliations]
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
 *         description: Reconciliation detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReconciliationDetailResponse'
 *       404:
 *         description: Not found
 */
router.get('/:id', getReconciliation);

/**
 * @swagger
 * /api/v1/admin/reconciliations/{id}/close:
 *   post:
 *     summary: Finalize and close day with physical cash/card/momo counts
 *     tags: [Reconciliations]
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
 *             $ref: '#/components/schemas/CloseReconciliationBody'
 *     responses:
 *       200:
 *         description: Day closed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReconciliationDetailResponse'
 *       400:
 *         description: Validation error (e.g. notes required when cash variance is non-zero)
 */
router.post('/:id/close', validateBody(closeSchema), closeReconciliation);

/**
 * @swagger
 * /api/v1/admin/reconciliations/{id}/reopen:
 *   post:
 *     summary: Reopen a closed day for editing
 *     tags: [Reconciliations]
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
 *         description: Day reopened
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReconciliationDetailResponse'
 */
router.post('/:id/reopen', reopenReconciliation);

export default router;
