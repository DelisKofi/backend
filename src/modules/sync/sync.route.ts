import { Router } from 'express';
import { pull, push } from './sync.controller.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';

/**
 * @swagger
 * tags:
 *   name: Sync
 *   description: Data synchronization endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SyncChanges:
 *       type: object
 *       properties:
 *         changes:
 *           type: object
 *           additionalProperties:
 *             type: object
 *             properties:
 *               created:
 *                 type: array
 *                 items:
 *                   type: object
 *               updated:
 *                 type: array
 *                 items:
 *                   type: object
 *               deleted:
 *                 type: array
 *                 items:
 *                   type: string
 */

/**
 * @swagger
 * /api/v1/sync/pull:
 *   get:
 *     summary: Pull data from server
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lastSyncTime
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Data successfully pulled
 * 
 * /api/v1/sync/push:
 *   post:
 *     summary: Push data to server
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SyncChanges'
 *     responses:
 *       200:
 *         description: Data successfully pushed
 */

const router = Router();

// Secure sync endpoints with authMiddleware
router.get('/pull', authMiddleware, pull);
router.post('/push', authMiddleware, push);

export default router;
