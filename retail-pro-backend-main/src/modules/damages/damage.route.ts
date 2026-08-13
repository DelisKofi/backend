import { Router } from 'express';
import { validateBody } from '../../middlewares/validateBody.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import {
  getDamages,
  getDamageDashboard,
  getDamage,
  createDamage,
  updateDamage,
  deleteDamage,
} from './damage.controller.js';
import { createDamageSchema, updateDamageSchema } from './damage.validation.js';

/**
 * @swagger
 * tags:
 *   name: Damages
 *   description: Product damage and loss management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     DamageCause:
 *       type: string
 *       enum: [broken, expired, spoilage, damage, theft, other]
 *     CreateDamage:
 *       type: object
 *       required:
 *         - damagedAt
 *         - productName
 *         - quantity
 *         - unitCost
 *         - cause
 *       properties:
 *         damagedAt:
 *           type: string
 *           format: date-time
 *           description: Date and time the damage occurred
 *         productId:
 *           type: string
 *         productName:
 *           type: string
 *         specs:
 *           type: string
 *         imageUrl:
 *           type: string
 *         quantity:
 *           type: integer
 *         unitCost:
 *           type: number
 *         totalLoss:
 *           type: number
 *           description: Optional, calculated as quantity * unitCost if omitted
 *         cause:
 *           $ref: '#/components/schemas/DamageCause'
 *         notes:
 *           type: string
 *         branchId:
 *           type: string
 *     UpdateDamage:
 *       type: object
 *       properties:
 *         damagedAt:
 *           type: string
 *           format: date-time
 *         productName:
 *           type: string
 *         specs:
 *           type: string
 *         imageUrl:
 *           type: string
 *         quantity:
 *           type: integer
 *         unitCost:
 *           type: number
 *         totalLoss:
 *           type: number
 *         cause:
 *           $ref: '#/components/schemas/DamageCause'
 *         notes:
 *           type: string
 *     DamageResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         damagedAt:
 *           type: string
 *           format: date-time
 *         productId:
 *           type: string
 *         productName:
 *           type: string
 *         specs:
 *           type: string
 *         imageUrl:
 *           type: string
 *         quantity:
 *           type: integer
 *         unitCost:
 *           type: number
 *         totalLoss:
 *           type: number
 *         cause:
 *           $ref: '#/components/schemas/DamageCause'
 *         loggedBy:
 *           type: string
 *           description: Full name of the user who logged the damage
 *         notes:
 *           type: string
 *         branchId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/admin/damages:
 *   get:
 *     summary: Get all damage records (paginated, filterable)
 *     tags: [Damages]
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
 *       - in: query
 *         name: cause
 *         schema:
 *           $ref: '#/components/schemas/DamageCause'
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
 *         description: List of damage records
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
 *                     $ref: '#/components/schemas/DamageResponse'
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
 *     summary: Log a new damage record
 *     tags: [Damages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDamage'
 *     responses:
 *       201:
 *         description: Damage record created successfully
 *
 * /api/v1/admin/damages/dashboard:
 *   get:
 *     summary: Get damage summary statistics (dashboard)
 *     tags: [Damages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
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
 *     responses:
 *       200:
 *         description: Damage summary stats
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
 *                     totalRecords:
 *                       type: integer
 *                     totalItemsLoss:
 *                       type: number
 *                     financialLoss:
 *                       type: number
 *                     topCause:
 *                       type: string
 *
 * /api/v1/admin/damages/{id}:
 *   get:
 *     summary: Get a damage record by ID
 *     tags: [Damages]
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
 *         description: Damage record details
 *   put:
 *     summary: Update a damage record
 *     tags: [Damages]
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
 *             $ref: '#/components/schemas/UpdateDamage'
 *     responses:
 *       200:
 *         description: Damage record updated successfully
 *   delete:
 *     summary: Soft-delete a damage record
 *     tags: [Damages]
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
 *         description: Damage record deleted successfully
 */

const router = Router();

router.route('/')
  .get(getDamages)
  .post(authMiddleware, validateBody(createDamageSchema), createDamage);

router.get('/dashboard', getDamageDashboard);

router.route('/:id')
  .get(getDamage)
  .put(validateBody(updateDamageSchema), updateDamage)
  .delete(deleteDamage);

export default router;
