import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './authMiddleware.js';
import { AppError } from '../errors/AppError.js';

/**
 * Middleware to enforce branch authorization for specific routes that involve `req.query.branchId` or `req.body.branchId`
 */
export const requireBranchAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { user } = req;
    if (!user) throw new AppError('User context missing', 401);

    // Assume an org-wide admin check exists (e.g., if branchIds map contains an `*` or role is "Global Admin")
    // Note: Can adapt according to exact "admin" role permission structure
    if (user.permissions?.globalAdmin) {
      return next();
    }

    const requestedBranchId = req.query.branchId || req.body.branchId;

    if (requestedBranchId && !user.branchIds.includes(requestedBranchId as string)) {
      throw new AppError('Unauthorized access to this branch', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};
