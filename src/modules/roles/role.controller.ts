import type { Request, Response, NextFunction } from 'express';
import { Role } from './role.model.js';
import { User } from '../users/user.model.js';
import { AppError } from '../../errors/AppError.js';

const buildPagination = (req: Request) => {
  const page = req.query.page ? Math.max(1, Number(req.query.page)) : undefined;
  const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : undefined;
  return { page, limit };
};

export const getRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query: Record<string, unknown> = {};
    if (!req.query.includeDeleted) query.deletedAt = null;

    const { page, limit } = buildPagination(req);
    let total: number | undefined;

    let queryBuilder = Role.find(query);
    if (page && limit) {
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(limit);
      total = await Role.countDocuments(query);
    }

    const roles = await queryBuilder.lean();
    const roleIds = roles.map((r) => r._id);
    const counts = await User.aggregate<{ _id: string; count: number }>([
      { $match: { roleId: { $in: roleIds }, deletedAt: null } },
      { $group: { _id: '$roleId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((e) => [e._id, e.count]));

    const data = roles.map((r) => ({ ...r, userCount: countMap.get(r._id) ?? 0 }));
    res.status(200).json({ success: true, data, ...(page && limit && { meta: { total, page, limit } }) });
  } catch (error) { next(error); }
};

export const getRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = await Role.findById(req.params.id).lean();
    if (!role) throw new AppError('Role not found', 404);
    const userCount = await User.countDocuments({ roleId: role._id, deletedAt: null });
    res.status(200).json({ success: true, data: { ...role, userCount } });
  } catch (error) { next(error); }
};

export const createRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, permissions,allAccess,allBranches } = req.body;
    if (!name) throw new AppError('name is required', 400);
    const role = await Role.create({ name, description, permissions: permissions || {},allAccess,allBranches });
    res.status(201).json({ success: true, data: role });
  } catch (error) { next(error); }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, permissions } = req.body;
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { name, description, permissions },
      { new: true, runValidators: true }
    );
    if (!role) throw new AppError('Role not found', 404);
    res.status(200).json({ success: true, data: role });
  } catch (error) { next(error); }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, { deletedAt: new Date() }, { new: true });
    if (!role) throw new AppError('Role not found', 404);
    res.status(200).json({ success: true, data: null });
  } catch (error) { next(error); }
};
