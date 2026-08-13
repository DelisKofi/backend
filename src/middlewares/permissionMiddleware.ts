import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./authMiddleware.js";
import { AppError } from "../errors/AppError.js";

const hasPermission = (req: AuthRequest, permission: string): boolean => {
  const permissions = req.user?.permissions;
  if (!permissions || typeof permissions !== "object") {
    return false;
  }
  if (permissions.globalAdmin === true) {
    return true;
  }
  if (req.user?.role?.allAccess === true) {
    return true;
  }
  return permissions[permission] === true;
};

export const requirePermission =
  (permission: string) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError("User context missing", 401);
      }
      if (!hasPermission(req, permission)) {
        throw new AppError("Forbidden", 403);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
