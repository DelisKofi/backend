import { Router } from 'express';
import { validateBody } from '../../middlewares/validateBody.js';
import { createInvitation } from './invitation.controller.js';
import { createInvitationSchema } from './invitation.validation.js';

/**
 * @swagger
 * tags:
 *   name: Invitations
 *   description: Invitation management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     InviteRow:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         roleId:
 *           type: string
 *         roleValue:
 *           type: string
 *           enum: [administrator, sales_person, viewer]
 *         roleLabel:
 *           type: string
 *         branchIds:
 *           type: array
 *           items:
 *             type: string
 *     CreateInvitation:
 *       oneOf:
 *         - $ref: '#/components/schemas/InviteRow'
 *         - type: array
 *           items:
 *             $ref: '#/components/schemas/InviteRow'
 *         - type: object
 *           properties:
 *             invites:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/InviteRow'
 */

/**
 * @swagger
 * /api/v1/admin/invitations:
 *   get:
 *     summary: Get all invitations
 *     tags: [Invitations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invitations
 *   post:
 *     summary: Create new invitations
 *     tags: [Invitations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInvitation'
 *     responses:
 *       201:
 *         description: Invitations sent successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */

const router = Router();

router.post('/', validateBody(createInvitationSchema), createInvitation);

export default router;
