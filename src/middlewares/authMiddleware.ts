/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError.js";
import { authEnv } from "../config/authEnv.js";
import { User } from "../modules/users/user.model.js";
import { Role } from "../modules/roles/role.model.js";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roleId: string;
    branchIds: string[];
    permissions: any;
    role: {
      id: string;
      name: string;
      description?: string;
      allAccess: boolean;
      allBranches: boolean;
      permissions: any;
    } | null;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    let token = "";

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1] || "";
    } else if (req.headers.cookie) {
      // Parse cookies
      const cookies: Record<string, string> = {};
      req.headers.cookie.split(";").forEach((cookie) => {
        const [name, ...rest] = cookie.split("=");
        if (name && rest) {
          cookies[name.trim()] = decodeURIComponent(rest.join("="));
        }
      });
      token = cookies["accessToken"] || "";
    }

    if (!token) {
      throw new AppError("Authentication token missing or invalid format", 401);
    }

    const decoded = jwt.verify(token as string, authEnv.JWT_SECRET as string);
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("userId" in decoded)
    ) {
      throw new AppError("Invalid token", 401);
    }
    const { userId, tv } = decoded as { userId: string; tv?: number };

    const user = await User.findById(userId).lean();
    if (!user || user.deletedAt) {
      throw new AppError("User not found or disabled", 401);
    }

    const tokenVersion = user.tokenVersion ?? 0;
    const tokenTv = typeof tv === 'number' ? tv : 0;
    if (tokenTv !== tokenVersion) {
      throw new AppError("Session expired. Please log in again", 401);
    }

    const role = await Role.findById(user.roleId).lean();

    // Inject into request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      branchIds: user.branchIds,
      permissions: role ? role.permissions : {},
      role: role
        ? {
            id: String(role._id),
            name: role.name,
            description: (role as any).description,
            allAccess: (role as any).allAccess ?? false,
            allBranches: (role as any).allBranches ?? false,
            permissions: role.permissions,
          }
        : null,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError("Token expired", 401));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError("Invalid token", 401));
    } else {
      next(error);
    }
  }
};
