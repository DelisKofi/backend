import type { Request, Response, NextFunction } from 'express';
import { Branch } from './branch.model.js';
import { AppError } from '../../errors/AppError.js';
import { getPagination } from '../../utils/pagination.js';

export const getBranches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query: Record<string, unknown> = {};
    if (!req.query.includeDeleted) {
      query.deletedAt = null;
    }

    const { page, limit } = getPagination(req, {
      pageKeys: ['page', 'branchesPage'],
      limitKeys: ['limit', 'branchesLimit'],
    });

    let total: number | undefined;
    let queryBuilder = Branch.find(query as Record<string, unknown>);

    if (page && limit) {
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(limit);
      total = await Branch.countDocuments(query as Record<string, unknown>);
    }

    const branches = await queryBuilder.lean();
    res.status(200).json({
      success: true,
      data: branches,
      ...(page && limit && {
        meta: { total, page, limit },
      }),
    });
  } catch (error) { next(error); }
};

export const getBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branch = await Branch.findById(req.params.id).lean();
    if (!branch) throw new AppError('Branch not found', 404);
    res.status(200).json({ success: true, data: branch });
  } catch (error) { next(error); }
};

export const createBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, location, contactEmail, contactPhone } = req.body;
    if (!name || !location) throw new AppError('name and location are required', 400);
    const branch = await Branch.create({ name, location, contactEmail, contactPhone });
    res.status(201).json({ success: true, data: branch });
  } catch (error) { next(error); }
};

export const updateBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, location, contactEmail, contactPhone } = req.body;
    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      { name, location, contactEmail, contactPhone },
      { new: true, runValidators: true }
    );
    if (!branch) throw new AppError('Branch not found', 404);
    res.status(200).json({ success: true, data: branch });
  } catch (error) { next(error); }
};

export const deleteBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, { deletedAt: new Date() }, { new: true });
    if (!branch) throw new AppError('Branch not found', 404);
    res.status(200).json({ success: true, data: null });
  } catch (error) { next(error); }
};
