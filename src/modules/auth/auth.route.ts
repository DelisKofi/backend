import { Router } from 'express';
import { validateBody } from '../../middlewares/validateBody.js';
import { login, logout, getMe, acceptInvite, createUser, setPassword } from './auth.controller.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { acceptInviteSchema, loginSchema, setPasswordSchema } from './auth.validation.js';

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User login, logout, and session management
 */

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully logged in
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 * 
 * /api/v1/auth/logout:
 *   post:
 *     summary: Log out a user
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Successfully logged out
 * 
 * /api/v1/auth/accept-invite:
 *   post:
 *     summary: Accept an invitation to join the system
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Invalid token or missing fields
 * 
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user details
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details
 *       401:
 *         description: Unauthorized
 * 
 * /api/v1/auth/set-password:
 *   post:
 *     summary: Set a new password (for first-time users)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 * 
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh authentication token
 *     tags: [Authentication]
 *     responses:
 *       501:
 *         description: Not implemented
 */

/**
 * /api/v1/auth/create-user:
 *   post:
 *     summary: Create a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.post('/logout', logout);
router.post('/accept-invite', validateBody(acceptInviteSchema), acceptInvite);
router.post('/create-user', validateBody(acceptInviteSchema), createUser);
router.post('/set-password', authMiddleware, validateBody(setPasswordSchema), setPassword);

// Protected routes
router.get('/me', authMiddleware, getMe);
// Refresh token route if applicable matching /auth/refresh
router.post('/refresh', (req, res) => res.status(501).json({ message: 'Refresh token relies on frontend implementation choices (Cookies/Storage) - Not Yet Implemented' }));

export default router;
