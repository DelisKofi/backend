import { Router } from 'express';
import { validateBody } from '../../middlewares/validateBody.js';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from './customer.controller.js';
import { createCustomerSchema, updateCustomerSchema } from './customer.validation.js';

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Customer management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateCustomer:
 *       type: object
 *       required:
 *         - name
 *         - phone
 *         - email
 *         - tier
 *       properties:
 *         name:
 *           type: string
 *         phone:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         tier:
 *           type: string
 *           enum: [retail, wholesale, vip]
 *         totalPurchases:
 *           type: number
 *         lastPurchaseDate:
 *           type: string
 *           format: date-time
 *         branchId:
 *           type: string
 *     UpdateCustomer:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         phone:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         tier:
 *           type: string
 *           enum: [retail, wholesale, vip]
 *         totalPurchases:
 *           type: number
 *         lastPurchaseDate:
 *           type: string
 *           format: date-time
 *         branchId:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/admin/customers:
 *   get:
 *     summary: Get all customers
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by branch
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number (1-based); use with limit for meta
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *         description: Page size (max 1000)
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *         description: Include soft-deleted customers
 *     responses:
 *       200:
 *         description: List of customers
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCustomer'
 *     responses:
 *       201:
 *         description: Customer created successfully
 *
 * /api/v1/admin/customers/{id}:
 *   get:
 *     summary: Get a customer by ID
 *     tags: [Customers]
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
 *         description: Customer details
 *   put:
 *     summary: Update a customer
 *     tags: [Customers]
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
 *             $ref: '#/components/schemas/UpdateCustomer'
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *   delete:
 *     summary: Delete a customer
 *     tags: [Customers]
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
 *         description: Customer deleted successfully
 */

const router = Router();
router.route('/')
  .get(getCustomers)
  .post(validateBody(createCustomerSchema), createCustomer);

router.route('/:id')
  .get(getCustomer)
  .put(validateBody(updateCustomerSchema), updateCustomer)
  .delete(deleteCustomer);

export default router;
