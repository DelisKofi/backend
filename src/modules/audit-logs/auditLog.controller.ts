import type { Request, Response, NextFunction } from 'express';
import { AuditLog } from './auditLog.model.js';
import { AppError } from '../../errors/AppError.js';
import { getPagination } from '../../utils/pagination.js';

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, category, startDate, endDate, user } = req.query;
    const query: Record<string, unknown> = {};
    if (!req.query.includeDeleted) {
      query.deletedAt = null;
    }
    if (branchId) query.branchId = branchId;
    if (category) query.category = category;
    
    if (startDate || endDate) {
      const dateQuery: Record<string, Date> = {};
      if (startDate) dateQuery.$gte = new Date(startDate as string);
      if (endDate) {
        const toDate = new Date(String(endDate));
        if (String(endDate).length === 10) {
          toDate.setUTCHours(23, 59, 59, 999);
        }
        dateQuery.$lte = toDate;
      }
      query.occurredAt = dateQuery;
    }

    if (user) {
      query.actorName = { $regex: user as string, $options: 'i' };
    }

    const { page, limit } = getPagination(req);
    let total: number | undefined;
    let queryBuilder = AuditLog.find(query).sort({ occurredAt: -1 });

    if (page && limit) {
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(limit);
      total = await AuditLog.countDocuments(query);
    }

    const logs = await queryBuilder.lean();
    res.status(200).json({
      success: true,
      data: logs,
      ...(page && limit && {
        meta: { total, page, limit },
      }),
    });
  } catch (error) { next(error); }
};

export const getAuditLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const log = await AuditLog.findById(req.params.id).lean();
    if (!log) throw new AppError('Audit log not found', 404);
    res.status(200).json({ success: true, data: log });
  } catch (error) { next(error); }
};

// Audit logs are typically created internally by other modules (e.g., after a sale).
// This endpoint allows admin-level manual creation if needed.
export const createAuditLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { iconKind, title, description, actorName, occurredAt, category, branchId, metadata } = req.body;
    if (!iconKind || !title || !actorName || !occurredAt || !category) {
      throw new AppError('iconKind, title, actorName, occurredAt, and category are required', 400);
    }
    const log = await AuditLog.create({ iconKind, title, description, actorName, occurredAt, category, branchId, metadata });
    res.status(201).json({ success: true, data: log });
  } catch (error) { next(error); }
};

export const updateAuditLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const log = await AuditLog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!log) throw new AppError('Audit log not found', 404);
    res.status(200).json({ success: true, data: log });
  } catch (error) { next(error); }
};

export const deleteAuditLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const log = await AuditLog.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true }
    );
    if (!log) throw new AppError('Audit log not found', 404);
    res.status(200).json({ success: true, data: null });
  } catch (error) { next(error); }
};
