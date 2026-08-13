import type { Request, Response, NextFunction } from 'express';
import { Damage } from './damage.model.js';
import { AppError } from '../../errors/AppError.js';
import type { AuthRequest } from '../../middlewares/authMiddleware.js';
import { getPagination } from '../../utils/pagination.js';

export const getDamages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, cause, startDate, endDate } = req.query;
    const query: Record<string, unknown> = { deletedAt: null };

    if (branchId) query.branchId = branchId;
    if (cause) query.cause = cause;

    if (startDate || endDate) {
      const dateQuery: Record<string, Date> = {};
      if (startDate) dateQuery.$gte = new Date(startDate as string);
      if (endDate) dateQuery.$lte = new Date(endDate as string);
      query.damagedAt = dateQuery;
    }

    const { page, limit } = getPagination(req);
    let total: number | undefined;
    let queryBuilder = Damage.find(query).sort({ damagedAt: -1 });

    if (page && limit) {
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(limit);
      total = await Damage.countDocuments(query);
    }

    const damages = await queryBuilder.lean();
    res.status(200).json({
      success: true,
      data: damages,
      ...(page && limit && { meta: { total, page, limit } }),
    });
  } catch (error) { next(error); }
};

export const getDamageDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    const match: Record<string, unknown> = { deletedAt: null };

    if (branchId) match.branchId = branchId;
    if (startDate || endDate) {
      const dateQuery: Record<string, Date> = {};
      if (startDate) dateQuery.$gte = new Date(startDate as string);
      if (endDate) dateQuery.$lte = new Date(endDate as string);
      match.damagedAt = dateQuery;
    }

    const aggregation = await Damage.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          totalItemsLoss: { $sum: '$quantity' },
          financialLoss: { $sum: '$totalLoss' },
        },
      },
    ]);

    const causeCounts = await Damage.aggregate([
      { $match: match },
      { $group: { _id: '$cause', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    if (aggregation.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalRecords: 0,
          totalItemsLoss: 0,
          financialLoss: 0,
          topCause: 'N/A',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        totalRecords: aggregation[0].totalRecords,
        totalItemsLoss: aggregation[0].totalItemsLoss,
        financialLoss: aggregation[0].financialLoss,
        topCause: causeCounts.length > 0 ? causeCounts[0]._id : 'N/A',
      },
    });
  } catch (error) { next(error); }
};

export const getDamage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const damage = await Damage.findById(req.params.id).lean();
    if (!damage) throw new AppError('Damage record not found', 404);
    res.status(200).json({ success: true, data: damage });
  } catch (error) { next(error); }
};

export const createDamage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { damagedAt, productId, productName, specs, imageUrl, quantity, unitCost, totalLoss, cause, notes, branchId } = req.body;
    if (!damagedAt || !productName || quantity === undefined || unitCost === undefined || !cause) {
      throw new AppError('damagedAt, productName, quantity, unitCost, and cause are required', 400);
    }
    if (!req.user) throw new AppError('Unauthorized', 401);
    const loggedBy = `${req.user.firstName} ${req.user.lastName}`;
    
    const damage = await Damage.create({
      damagedAt,
      productId,
      productName,
      specs,
      imageUrl,
      quantity,
      unitCost,
      totalLoss: totalLoss ?? (quantity * unitCost),
      cause,
      loggedBy,
      notes,
      branchId
    });
    
    try {
      await import('../audit-logs/auditLog.model.js').then(({ AuditLog }) => {
        return AuditLog.create({
          iconKind: 'product',
          title: 'Stock Damage Recorded',
          description: `Recorded ${quantity} damaged items of ${productName}`,
          actorName: loggedBy,
          occurredAt: new Date(),
          category: 'stock_adjustment',
          branchId: branchId,
          metadata: { damageId: damage._id, productId, quantity }
        } as unknown as Record<string, unknown>);
      });
    } catch (err) {
      console.error('Failed to create audit log for damage creation:', err);
    }

    res.status(201).json({ success: true, data: damage });
  } catch (error) { next(error); }
};

export const updateDamage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const damage = await Damage.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: 'after', runValidators: true }
    );
    if (!damage) throw new AppError('Damage record not found', 404);

    try {
      await import('../audit-logs/auditLog.model.js').then(({ AuditLog }) => {
        return AuditLog.create({
          iconKind: 'product',
          title: 'Stock Damage Updated',
          description: `Updated damage record for ${damage.productName}`,
          actorName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System',
          occurredAt: new Date(),
          category: 'stock_adjustment',
          branchId: damage.branchId,
          metadata: { damageId: damage._id, productId: damage.productId }
        } as unknown as Record<string, unknown>);
      });
    } catch (err) {
      console.error('Failed to create audit log for damage update:', err);
    }

    res.status(200).json({ success: true, data: damage });
  } catch (error) { next(error); }
};

export const deleteDamage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const damage = await Damage.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
    if (!damage) throw new AppError('Damage record not found', 404);

    try {
      await import('../audit-logs/auditLog.model.js').then(({ AuditLog }) => {
        return AuditLog.create({
          iconKind: 'product',
          title: 'Stock Damage Deleted',
          description: `Deleted damage record for ${damage.productName}`,
          actorName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System',
          occurredAt: new Date(),
          category: 'stock_adjustment',
          branchId: damage.branchId,
          metadata: { damageId: damage._id }
        } as unknown as Record<string, unknown>);
      });
    } catch (err) {
      console.error('Failed to create audit log for damage deletion:', err);
    }

    res.status(200).json({ success: true, data: null });
  } catch (error) { next(error); }
};
