import { Router } from 'express';
import { validateBody } from '../../middlewares/validateBody.js';
import { createRoleSchema, updateRoleSchema } from './role.validation.js';
import { getRoles, getRole, createRole, updateRole, deleteRole } from './role.controller.js';

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Role management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateRole:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         allAccess:
 *           type: boolean
 *           default: false
 *         allBranches:
 *           type: boolean
 *           default: false
 *         permissions:
 *           type: object
 *           additionalProperties: true
 *     UpdateRole:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         allAccess:
 *           type: boolean
 *           default: false
 *         allBranches:
 *           type: boolean
 *           default: false
 *         permissions:
 *           type: object
 *           additionalProperties: true
 */

/**
 * @swagger
 * /api/v1/admin/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRole'
 *     responses:
 *       201:
 *         description: Role created successfully
 *
 * /api/v1/admin/roles/{id}:
 *   get:
 *     summary: Get a role by ID
 *     tags: [Roles]
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
 *         description: Role details
 *   put:
 *     summary: Update a role
 *     tags: [Roles]
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
 *             $ref: '#/components/schemas/UpdateRole'
 *     responses:
 *       200:
 *         description: Role updated successfully
 *   delete:
 *     summary: Delete a role
 *     tags: [Roles]
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
 *         description: Role deleted successfully
 */

const router = Router();
router.route('/')
  .get(getRoles)
  .post(validateBody(createRoleSchema), createRole);

router.route('/:id')
  .get(getRole)
  .put(validateBody(updateRoleSchema), updateRole)
  .delete(deleteRole);

export default router;
