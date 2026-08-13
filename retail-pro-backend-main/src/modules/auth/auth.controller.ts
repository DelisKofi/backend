/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../users/user.model.js";
import { Role } from "../roles/role.model.js";
import { Invitation } from "../invitations/invitation.model.js";
import { AppError } from "../../errors/AppError.js";
import { authEnv } from "../../config/authEnv.js";
import type { AuthRequest } from "../../middlewares/authMiddleware.js";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    const user = await User.findOne({
      email,
      status: "active",
      deletedAt: null,
    }).lean();
    if (!user || !user.passwordHash) {
      throw new AppError("Invalid credentials", 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError("Invalid credentials", 401);
    }

    const role = await Role.findById(user.roleId).lean();

    const tokenVersion = user.tokenVersion ?? 0;
    const token = jwt.sign(
      { userId: String(user._id), tv: tokenVersion },
      authEnv.JWT_SECRET,
      {
        expiresIn: authEnv.JWT_EXPIRES_IN as any,
      },
    );

    await User.updateOne({ _id: user._id }, { lastActiveAt: new Date() });

    // Create Audit Log
    try {
      await import('../audit-logs/auditLog.model.js').then(({ AuditLog }) => {
        return AuditLog.create({
          iconKind: 'user',
          title: 'User Login',
          description: `User ${user.firstName} ${user.lastName} logged in`,
          actorName: `${user.firstName} ${user.lastName}`,
          occurredAt: new Date(),
          category: 'login',
          metadata: { userId: user._id, email: user.email }
        } as any);
      });
    } catch (err) {
      console.error('Failed to create login audit log:', err);
    }

    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: token,
        expiresIn: authEnv.JWT_EXPIRES_IN,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roleId: user.roleId,
          branchIds: user.branchIds,
          isFirstTimeUser: user.isFirstTimeUser,
          permissions: role?.permissions || {},
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
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.clearCookie("accessToken");
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};

export const acceptInvite = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token, password, firstName, lastName } = req.body;

    if (!token || !password || !firstName || !lastName) {
      throw new AppError("Missing required fields", 400);
    }

    const invitation = await Invitation.findOne({
      tokenHash: token,
      acceptedAt: null,
    });

    if (!invitation) {
      throw new AppError("Invalid or reused invitation token", 400);
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      throw new AppError("Invitation expired", 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email: invitation.email,
      passwordHash,
      firstName,
      lastName,
      roleId: invitation.roleId,
      branchIds: invitation.branchIds,
      status: "active",
      lastActiveAt: new Date(),
    });

    invitation.acceptedAt = new Date();
    await invitation.save();

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        id: newUser._id,
        email: newUser.email,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const createUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      throw new AppError("Missing required fields", 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email,
      passwordHash,
      firstName,
      lastName,
      roleId: "6810e582e613d6b59260c79c",
      branchIds: ["6810e582e613d6b59260c79c"],
      status: "active",
      lastActiveAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: newUser._id,
        email: newUser.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const setPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { password } = req.body;
    if (!password) {
      throw new AppError("Password is required", 400);
    }

    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await User.updateOne(
      { _id: req.user.id },
      { passwordHash, isFirstTimeUser: false },
    );

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};
