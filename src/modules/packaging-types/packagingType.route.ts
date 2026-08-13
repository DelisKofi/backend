import { Router } from 'express';
import { validateBody } from '../../middlewares/validateBody.js';
import {
  getPackagingTypes,
  getPackagingType,
  createPackagingType,
  updatePackagingType,
  deletePackagingType,
} from './packagingType.controller.js';
import { createPackagingTypeSchema, updatePackagingTypeSchema } from './packagingType.validation.js';

/**
 * @swagger
 * tags:
 *   name: PackagingTypes
 *   description: Store-wide packaging labels
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PackagingTypeResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreatePackagingType:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *     UpdatePackagingType:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/admin/packaging-types:
 *   get:
 *     summary: Get all packaging types
 *     tags: [PackagingTypes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of packaging types
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
 *                     $ref: '#/components/schemas/PackagingTypeResponse'
 *   post:
 *     summary: Create a new packaging type
 *     tags: [PackagingTypes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePackagingType'
 *     responses:
 *       201:
 *         description: Packaging type created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PackagingTypeResponse'
 *       409:
 *         description: Duplicate name
 *
 * /api/v1/admin/packaging-types/{id}:
 *   get:
 *     summary: Get a packaging type by ID
 *     tags: [PackagingTypes]
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
 *         description: Packaging type details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PackagingTypeResponse'
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update a packaging type
 *     tags: [PackagingTypes]
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
 *             $ref: '#/components/schemas/UpdatePackagingType'
 *     responses:
 *       200:
 *         description: Packaging type updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PackagingTypeResponse'
 *       404:
 *         description: Not found
 *       409:
 *         description: Duplicate name
 *   delete:
 *     summary: Delete a packaging type
 *     tags: [PackagingTypes]
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
 *         description: Packaging type deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Not found
 *       409:
 *         description: Type is referenced by products
 */

const router = Router();
router.route('/')
  .get(getPackagingTypes)
  .post(validateBody(createPackagingTypeSchema), createPackagingType);

router.route('/:id')
  .get(getPackagingType)
  .put(validateBody(updatePackagingTypeSchema), updatePackagingType)
  .delete(deletePackagingType);

export default router;
