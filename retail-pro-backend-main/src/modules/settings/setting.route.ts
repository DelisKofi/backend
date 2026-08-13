import { Router } from 'express';
import { validateBody } from '../../middlewares/validateBody.js';
import {
  getGlobalSetting,
  updateGlobalSetting,
} from './setting.controller.js';
import { updateGlobalSettingSchema } from './setting.validation.js';

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Global organization settings
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     GlobalSettingResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         currency:
 *           type: string
 *         lowStockThresholdFallback:
 *           type: number
 *         requireManagerPriceOverride:
 *           type: boolean
 *         receiptFooterText:
 *           type: string
 *     UpdateGlobalSetting:
 *       type: object
 *       properties:
 *         currency:
 *           type: string
 *         lowStockThresholdFallback:
 *           type: number
 *         requireManagerPriceOverride:
 *           type: boolean
 *         receiptFooterText:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/admin/settings:
 *   get:
 *     summary: Get global organization settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Global settings object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/GlobalSettingResponse'
 *   put:
 *     summary: Update global organization settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateGlobalSetting'
 *     responses:
 *       200:
 *         description: Global settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/GlobalSettingResponse'
 */

const router = Router();

router.route('/')
  .get(getGlobalSetting)
  .put(validateBody(updateGlobalSettingSchema), updateGlobalSetting);

export default router;
