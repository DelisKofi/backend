import type { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Invitation } from './invitation.model.js';
import { User } from '../users/user.model.js';
import { Role } from '../roles/role.model.js';
import { AppError } from '../../errors/AppError.js';
import type { AuthRequest } from '../../middlewares/authMiddleware.js';

export const createInvitation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.id) {
      throw new AppError('Unauthorized: Missing user context', 401);
    }

    const invites = Array.isArray(req.body) ? req.body : [req.body];
    const roleValueMap: Record<string, string> = {
      administrator: 'Administrator',
      sales_person: 'Sales Person',
      viewer: 'Viewer',
    };

    const results = [];

    for (const invite of invites) {
      const { email, roleId, roleValue, branchIds } = invite;

      const resolvedRoleId = roleId
        ? roleId
        : await (async () => {
          const roleName = roleValueMap[roleValue] ?? roleValue;
          const role = await Role.findOne({
            name: { $regex: new RegExp(`^${roleName}$`, 'i') },
          }).lean();
          if (!role) {
            throw new AppError(`Role not found for value "${roleValue}"`, 400);
          }
          return role._id;
        })();

      const existingUser = await User.findOne({ email, deletedAt: null }).lean();
      if (existingUser) {
        throw new AppError('A user with this email already exists', 400);
      }

      const existingInvite = await Invitation.findOne({
        email,
        acceptedAt: null,
        expiresAt: { $gt: new Date() },
      });
      if (existingInvite) {
        throw new AppError('An active invitation has already been sent to this email', 400);
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = rawToken;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const newInvitation = await Invitation.create({
        email,
        roleId: resolvedRoleId,
        branchIds: branchIds || [],
        tokenHash,
        expiresAt,
        invitedBy: req.user.id,
      });

      results.push({
        id: newInvitation._id,
        email: newInvitation.email,
        expiresAt: newInvitation.expiresAt,
        token: rawToken,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Invitations created successfully',
      data: results,
    });

  } catch (error) {
    next(error);
  }
};
