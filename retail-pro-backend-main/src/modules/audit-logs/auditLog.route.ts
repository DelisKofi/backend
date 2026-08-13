import { Router } from 'express';
import { validateBody } from '../../middlewares/validateBody.js';
import {
  getAuditLogs,
  getAuditLog,
  createAuditLog,
  updateAuditLog,
  deleteAuditLog,
} from './auditLog.controller.js';
import { createAuditLogSchema, updateAuditLogSchema } from './auditLog.validation.js';

/**
 * @swagger
 * tags:
 *   name: Audit Logs
 *   description: AuditLog management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateAuditLog:
 *       type: object
 *       required:
 *         - iconKind
 *         - title
 *         - actorName
 *         - occurredAt
 *         - category
 *       properties:
 *         iconKind:
 *           type: string
 *           enum: [sale, transfer, expense, product, user]
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         actorName:
 *           type: string
 *         occurredAt:
 *           type: string
 *           format: date-time
 *         category:
 *           type: string
 *           enum: [price_override, transfer, expense, sale, stock_adjustment, product_added, login]
 *         branchId:
 *           type: string
 *         metadata:
 *           type: object
 *     UpdateAuditLog:
 *       type: object
 *       properties:
 *         iconKind:
 *           type: string
 *           enum: [sale, transfer, expense, product, user]
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         actorName:
 *           type: string
 *         occurredAt:
 *           type: string
 *           format: date-time
 *         category:
 *           type: string
 *           enum: [price_override, transfer, expense, sale, stock_adjustment, product_added, login]
 *         branchId:
 *           type: string
 *         metadata:
 *           type: object
 */

/**
 * @swagger
 * /api/v1/admin/audit-logs:
 *   get:
 *     summary: Get all audit logs
 *     tags: [Audit Logs]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
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
 *       - in: query
 *         name: user
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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of audit logs
 *   post:
 *     summary: Create a new auditlog
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAuditLog'
 *     responses:
 *       201:
 *         description: AuditLog created successfully
 *
 * /api/v1/admin/audit-logs/{id}:
 *   get:
 *     summary: Get a auditlog by ID
 *     tags: [Audit Logs]
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
 *         description: AuditLog details
 *   put:
 *     summary: Update a auditlog
 *     tags: [Audit Logs]
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
 *             $ref: '#/components/schemas/UpdateAuditLog'
 *     responses:
 *       200:
 *         description: AuditLog updated successfully
 *   delete:
 *     summary: Delete a auditlog
 *     tags: [Audit Logs]
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
 *         description: AuditLog deleted successfully
 */

const router = Router();
router.route('/')
  .get(getAuditLogs)
  .post(validateBody(createAuditLogSchema), createAuditLog);

router.route('/:id')
  .get(getAuditLog)
  .put(validateBody(updateAuditLogSchema), updateAuditLog) // usually you dont update audit logs but left for admin
  .delete(deleteAuditLog);

export default router;
