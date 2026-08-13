import { Router } from "express";
import {
  listDebts,
  getDebt,
  createDebt,
  updateDebt,
  deleteDebt,
  addPayment,
  dashboard,
  listDebtors,
  listCreditors,
} from "./debt.controller.js";
import { validateBody } from "../../middlewares/validateBody.js";
import {
  createDebtSchema,
  updateDebtSchema,
  paymentSchema,
} from "./debt.validation.js";

/**
 * @swagger
 * tags:
 *   name: DebtsCredits
 *   description: Debtors and Creditors management
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentRecord:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         amount:
 *           type: number
 *         paidAt:
 *           type: string
 *           format: date-time
 *         note:
 *           type: string
 *         recordedBy:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *     DebtRecord:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [receivable, payable]
 *         customerId:
 *           type: string
 *           nullable: true
 *         partyName:
 *           type: string
 *         partyPhone:
 *           type: string
 *         partyEmail:
 *           type: string
 *         reference:
 *           type: string
 *         description:
 *           type: string
 *         amount:
 *           type: number
 *         paidAmount:
 *           type: number
 *         balance:
 *           type: number
 *         dueDate:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [open, partial, settled]
 *         branchId:
 *           type: string
 *         notes:
 *           type: string
 *         paymentDirection:
 *           type: string
 *           enum: [in, out]
 *         source:
 *           type: string
 *           enum: [manual, pos]
 *         transactionId:
 *           type: string
 *           nullable: true
 *         payments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PaymentRecord'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateDebt:
 *       type: object
 *       required: [type, partyName, description, amount]
 *       properties:
 *         type:
 *           type: string
 *           enum: [receivable, payable]
 *         customerId:
 *           type: string
 *         partyName:
 *           type: string
 *         partyPhone:
 *           type: string
 *         partyEmail:
 *           type: string
 *         reference:
 *           type: string
 *         description:
 *           type: string
 *         amount:
 *           type: number
 *           minimum: 0.01
 *         source:
 *           type: string
 *           enum: [manual, pos]
 *           description: Optional metadata; POS checkout creates this automatically and manual debt creation should usually omit it.
 *         dueDate:
 *           type: string
 *           format: date-time
 *         branchId:
 *           type: string
 *         notes:
 *           type: string
 *     UpdateDebt:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [receivable, payable]
 *         customerId:
 *           type: string
 *         partyName:
 *           type: string
 *         partyPhone:
 *           type: string
 *         partyEmail:
 *           type: string
 *         reference:
 *           type: string
 *         description:
 *           type: string
 *         amount:
 *           type: number
 *         dueDate:
 *           type: string
 *           format: date-time
 *         branchId:
 *           type: string
 *         notes:
 *           type: string
 *         status:
 *           type: string
 *           enum: [open, partial, settled]
 *     Payment:
 *       type: object
 *       required: [amount, paidAt]
 *       properties:
 *         amount:
 *           type: number
 *           minimum: 0.01
 *         paidAt:
 *           type: string
 *           format: date-time
 *         note:
 *           type: string
 *     ListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DebtRecord'
 *         meta:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *     ItemResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           $ref: '#/components/schemas/DebtRecord'
 *     DashboardResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             receivablesTotal:
 *               type: number
 *             payablesTotal:
 *               type: number
 *             overdueTotal:
 *               type: number
 *             netPosition:
 *               type: number
 *             openCount:
 *               type: integer
 *             partialCount:
 *               type: integer
 *             settledCount:
 *               type: integer
 */
const router = Router();

/**
 * @swagger
 * /api/v1/admin/debts-credits:
 *   get:
 *     summary: List debt and credit records
 *     tags: [DebtsCredits]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *       - in: query
 *         name: dueDateFrom
 *         schema:
 *           type: string
 *       - in: query
 *         name: dueDateTo
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List of records
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListResponse'
 */
router.get("/", listDebts);
/**
 * @swagger
 * /api/v1/admin/debts-credits/debtors:
 *   get:
 *     summary: List debtor (receivable) records (dedicated endpoint)
 *     tags: [DebtsCredits]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List of debtor records
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListResponse'
 */
router.get("/debtors", listDebtors);

/**
 * @swagger
 * /api/v1/admin/debts-credits/creditors:
 *   get:
 *     summary: List creditor (payable) records (dedicated endpoint)
 *     tags: [DebtsCredits]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List of creditor records
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListResponse'
 */
router.get("/creditors", listCreditors);

/**
 * @swagger
 * /api/v1/admin/debts-credits/{id}:
 *   get:
 *     summary: Get a debt/credit record by ID
 *     tags: [DebtsCredits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ItemResponse'
 */
/**
 * Note: place specific routes before the `/:id` route to avoid capture.
 */
router.get("/dashboard", dashboard);
router.post("/:id/payments", validateBody(paymentSchema), addPayment);
router.get("/:id", getDebt);

/**
 * @swagger
 * /api/v1/admin/debts-credits:
 *   post:
 *     summary: Create a new debt/credit record
 *     tags: [DebtsCredits]
 *     description: Keep this endpoint for manual receivables and payables. POS sales with credit are created automatically from POST /transactions and should not call this endpoint separately.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDebt'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ItemResponse'
 */
router.post("/", validateBody(createDebtSchema), createDebt);

/**
 * @swagger
 * /api/v1/admin/debts-credits/{id}:
 *   put:
 *     summary: Update a debt/credit record
 *     tags: [DebtsCredits]
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
 *             $ref: '#/components/schemas/UpdateDebt'
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ItemResponse'
 */
router.put("/:id", validateBody(updateDebtSchema), updateDebt);

router.delete("/:id", deleteDebt);

/**
 * @swagger
 * /api/v1/admin/debts-credits/{id}/payments:
 *   post:
 *     summary: Add a payment to a debt/credit record
 *     tags: [DebtsCredits]
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
 *             $ref: '#/components/schemas/Payment'
 *     responses:
 *       201:
 *         description: Payment recorded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ItemResponse'
 */
router.post("/:id/payments", validateBody(paymentSchema), addPayment);

/**
 * @swagger
 * /api/v1/admin/debts-credits/dashboard:
 *   get:
 *     summary: Dashboard summary for debts & credits
 *     tags: [DebtsCredits]
 *     responses:
 *       200:
 *         description: Dashboard
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardResponse'
 */
router.get("/dashboard", dashboard);

export default router;
