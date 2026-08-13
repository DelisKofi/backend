import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { User } from './user.model.js';
import { Role, type IRole } from '../roles/role.model.js';
import { AuditLog } from '../audit-logs/auditLog.model.js';
import { AppError } from '../../errors/AppError.js';
import type { AuthRequest } from '../../middlewares/authMiddleware.js';
import { generateDefaultPassword } from '../../utils/defaultPassword.js';

const buildPagination = (req: Request) => {
  const pageParam = req.query.page ?? req.query.usersPage;
  const limitParam = req.query.limit ?? req.query.usersLimit;
  const page = pageParam ? Math.max(1, Number(pageParam)) : undefined;
  const limit = limitParam ? Math.max(1, Number(limitParam)) : undefined;
  return { page, limit };
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query: Record<string, unknown> = {};
    if (!req.query.includeDeleted) query.deletedAt = null;
    if (req.query.roleId) query.roleId = req.query.roleId;
    if (req.query.status) query.status = req.query.status;
  if (req.query.branchId) query.branchIds = req.query.branchId;

    const { page, limit } = buildPagination(req);
    let total: number | undefined;

    let queryBuilder = User.find(query).select('-passwordHash');
    if (page && limit) {
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(limit);
      total = await User.countDocuments(query);
    }

    const users = await queryBuilder.lean();
    const roleIds = [...new Set(users.map((u) => u.roleId))];
    const roles = await Role.find({ _id: { $in: roleIds } }).lean();
    const roleMap = new Map(roles.map((r) => [String(r._id), r]));

    const data = users.map((u) => {
      const role = roleMap.get(String(u.roleId)) as IRole | undefined;
      return {
        ...u,
        role: role
          ? {
              id: String(role._id),
              name: role.name,
              description: role.description,
              allAccess: role.allAccess ?? false,
              allBranches: role.allBranches ?? false,
              permissions: role.permissions,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      data,
      ...(page && limit && { meta: { total, page, limit } }),
    });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash').lean();
    if (!user || user.deletedAt) throw new AppError('User not found', 404);

    const roleDoc = await Role.findById(user.roleId).lean<IRole>();
    const role = roleDoc
      ? {
          id: String(roleDoc._id),
          name: roleDoc.name,
          description: roleDoc.description,
          allAccess: roleDoc.allAccess ?? false,
          allBranches: roleDoc.allBranches ?? false,
          permissions: roleDoc.permissions,
        }
      : null;

    res.status(200).json({
      success: true,
      data: { ...user, role },
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, firstName, lastName, phone, roleId, branchIds, status } = req.body;
    if (!email || !firstName || !lastName || !roleId) {
      throw new AppError('email, firstName, lastName, and roleId are required', 400);
    }

    const defaultPassword = generateDefaultPassword();
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const user = await User.create({
      email,
      firstName,
      lastName,
      phone,
      roleId,
      branchIds,
      status: status || 'active',
      passwordHash,
      isFirstTimeUser: true,
    });

    res.status(201).json({
      success: true,
      data: {
        ...user.toObject(),
        passwordHash: undefined,
        defaultPassword, // Return this for the admin to provide to the user
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phone, roleId, branchIds, status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, phone, roleId, branchIds, status },
      { new: true, runValidators: true }
    ).select('-passwordHash').lean();
    if (!user) throw new AppError('User not found', 404);

    const roleDoc = await Role.findById(user.roleId).lean<IRole>();
    const role = roleDoc
      ? {
          id: String(roleDoc._id),
          name: roleDoc.name,
          description: roleDoc.description,
          allAccess: roleDoc.allAccess ?? false,
          allBranches: roleDoc.allBranches ?? false,
          permissions: roleDoc.permissions,
        }
      : null;

    res.status(200).json({ success: true, data: { ...user, role } });
  } catch (error) {
    next(error);
  }
};

export const resetUserPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const targetUserId = req.params.id;
    if (targetUserId === req.user.id) {
      throw new AppError('You cannot reset your own password', 400);
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser || targetUser.deletedAt) {
      throw new AppError('User not found', 404);
    }

    if (targetUser.status === 'disabled') {
      throw new AppError('Password reset is not allowed for disabled accounts', 409);
    }

    const defaultPassword = generateDefaultPassword();
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const nextTokenVersion = (targetUser.tokenVersion ?? 0) + 1;

    targetUser.passwordHash = passwordHash;
    targetUser.isFirstTimeUser = true;
    targetUser.tokenVersion = nextTokenVersion;
    await targetUser.save();

    const actorName = `${req.user.firstName} ${req.user.lastName}`.trim();
    await AuditLog.create({
      iconKind: 'user',
      title: 'Password reset',
      description: `Password reset for ${targetUser.firstName} ${targetUser.lastName}`,
      actorName,
      occurredAt: new Date(),
      category: 'user_password_reset',
      metadata: {
        action: 'user.password_reset',
        actorUserId: req.user.id,
        targetUserId: String(targetUser._id),
      },
    });

    res.status(200).json({
      success: true,
      data: {
        id: String(targetUser._id),
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        defaultPassword,
      },
      message: 'Password reset. Share the default password with the user.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date(), status: 'disabled' },
      { new: true }
    );
    if (!user) throw new AppError('User not found', 404);
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};
