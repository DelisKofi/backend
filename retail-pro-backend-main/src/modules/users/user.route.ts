import { Router } from "express";
import { validateBody } from "../../middlewares/validateBody.js";
import {
  createUserSchema,
  updateUserSchema,
  resetUserPasswordSchema,
} from "./user.validation.js";
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
} from "./user.controller.js";

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateUser:
 *       type: object
 *       required:
 *         - email
 *         - firstName
 *         - lastName
 *         - roleId
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phone:
 *           type: string
 *         roleId:
 *           type: string
 *         branchIds:
 *           type: array
 *           items:
 *             type: string
 *         status:
 *           type: string
 *           enum: [active, invited, disabled]
 *     UpdateUser:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phone:
 *           type: string
 *         roleId:
 *           type: string
 *         branchIds:
 *           type: array
 *           items:
 *             type: string
 *         status:
 *           type: string
 *           enum: [active, invited, disabled]
 *     UserRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phone:
 *           type: string
 *         roleId:
 *           type: string
 *         branchIds:
 *           type: array
 *           items:
 *             type: string
 *         status:
 *           type: string
 *           enum: [active, invited, disabled]
 *         lastActiveAt:
 *           type: string
 *           format: date-time
 *     UserListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserRecord'
 *         meta:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *     ResetUserPasswordResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Password reset. Share the default password with the user.
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             email:
 *               type: string
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             defaultPassword:
 *               type: string
 *               description: One-time plaintext password; only returned here and on create-user
 */

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter users who have this branch id in their branchIds array
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
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserListResponse'
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUser'
 *     responses:
 *       201:
 *         description: User created successfully. The response includes a system-generated 'defaultPassword'.
 *
 * /api/v1/admin/users/{id}/reset-password:
 *   post:
 *     summary: Reset a user's password (admin)
 *     description: |
 *       Generates a new default password, forces first-time password change on next login,
 *       and revokes existing sessions for the target user. Requires `users_edit` permission.
 *       Do not reset your own password via this endpoint.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Target user id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             maxProperties: 0
 *             description: Empty object; server generates the password
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResetUserPasswordResponse'
 *       400:
 *         description: Admin attempted to reset their own password
 *       403:
 *         description: Caller lacks users_edit permission
 *       404:
 *         description: Target user not found
 *       409:
 *         description: Target user is disabled
 *
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
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
 *         description: User details
 *   put:
 *     summary: Update a user
 *     tags: [Users]
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
 *             $ref: '#/components/schemas/UpdateUser'
 *     responses:
 *       200:
 *         description: User updated successfully
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
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
 *         description: User deleted successfully
 */

const router = Router();
router
  .route("/")
  .get(getUsers)
  .post(validateBody(createUserSchema), createUser);

router.post(
  "/:id/reset-password",
  // requirePermission('users_edit'),
  validateBody(resetUserPasswordSchema),
  resetUserPassword,
);

router
  .route("/:id")
  .get(getUser)
  .put(validateBody(updateUserSchema), updateUser)
  .delete(deleteUser);

export default router;
