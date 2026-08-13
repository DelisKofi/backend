import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { StockTransfer, type IStockTransferLineItem } from './stockTransfer.model.js';
import { Product } from '../products/product.model.js';
import { Branch } from '../branches/branch.model.js';
import { PackagingType } from '../packaging-types/packagingType.model.js';
import { AuditLog } from '../audit-logs/auditLog.model.js';
import { AppError } from '../../errors/AppError.js';
import type { AuthRequest } from '../../middlewares/authMiddleware.js';
import { getPagination } from '../../utils/pagination.js';

/** Shape the frontend sends — name/sku are optional and may arrive as productName */
interface LineItemInput {
  productId?: string;
  productName?: string;
  name?: string;
  sku?: string;
  quantity: number;
  imageUrl?: string;
  packagingBreakdown?: {
    configurations?: Array<{
      packagingTypeId?: string;
      packagingTypeNameSnapshot?: string;
      unitsPerPackageSnapshot?: number;
      containerCounts?: number[];
      singles?: number;
    }>;
    displayBreakdown?: string;
  };
}

interface PackagingConfigSnapshot {
  packagingTypeId: string;
  packagingTypeNameSnapshot: string;
  unitsPerPackageSnapshot: number;
  containerCounts: number[];
  singles: number;
}

export const createTransfer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();

    const { transferredAt, sourceBranchId, destinationBranchId, lineItems, status } = req.body;
    const transferredBy = req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System';
    const transferredByUserId = req.user?.id;
    const transferredByNameSnapshot = transferredBy;

    if (sourceBranchId === destinationBranchId) {
      throw new AppError('Source and destination branches cannot be identical', 400);
    }

    const [sourceBranch, destinationBranch] = await Promise.all([
      Branch.findById(sourceBranchId).lean().session(session),
      Branch.findById(destinationBranchId).lean().session(session),
    ]);

    const sourceBranchNameSnapshot = sourceBranch?.name ?? '';
    const destinationBranchNameSnapshot = destinationBranch?.name ?? '';

    const productIds = Array.from(
      new Set(
        (lineItems as LineItemInput[])
          .map((item) => item.productId)
          .filter((productId): productId is string => Boolean(productId))
      )
    );

    const products = await Product.find({ _id: { $in: productIds } })
      .lean()
      .session(session);
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    const packagingTypeIds = Array.from(
      new Set(
        products.flatMap((product) =>
          (product.packaging?.configurations ?? [])
            .map((config) => config.packagingTypeId)
            .filter((packagingTypeId): packagingTypeId is string => typeof packagingTypeId === 'string')
        )
      )
    );
    const packagingTypes = await PackagingType.find({ _id: { $in: packagingTypeIds } })
      .lean()
      .session(session);
    const packagingTypeNameMap = new Map(packagingTypes.map((packagingType) => [String(packagingType._id), packagingType.name]));

    const buildPackagingBreakdown = (
      quantity: number,
      lineItemBreakdown: LineItemInput['packagingBreakdown'],
      productConfigurations: Array<{ packagingTypeId: string; unitsPerPackage: number }>
    ) => {
      const incomingConfigurations = lineItemBreakdown?.configurations ?? [];

      const configurations: PackagingConfigSnapshot[] = productConfigurations.map((config, idx) => {
        const unitsPerPackageSnapshot = Number(config.unitsPerPackage) || 1;
        const packagingTypeNameSnapshot =
          packagingTypeNameMap.get(config.packagingTypeId) ??
          incomingConfigurations[idx]?.packagingTypeNameSnapshot ??
          'Unknown';
        const fallbackCount = Math.floor(quantity / unitsPerPackageSnapshot);
        const containerCounts = [Math.max(0, incomingConfigurations[idx]?.containerCounts?.[0] ?? fallbackCount)];
        return {
          packagingTypeId: config.packagingTypeId,
          packagingTypeNameSnapshot,
          unitsPerPackageSnapshot,
          containerCounts,
          singles: 0,
        };
      });

      const usedUnits = configurations.reduce(
        (sum, config) => sum + (config.containerCounts[0] ?? 0) * config.unitsPerPackageSnapshot,
        0
      );
      const singles = Math.max(0, quantity - usedUnits);
      if (configurations.length > 0) {
        configurations[configurations.length - 1]!.singles = singles;
      }

      return {
        configurations,
        displayBreakdown: lineItemBreakdown?.displayBreakdown,
      };
    };

    // Enrich lineItems with name and sku from the Product collection
    const enrichedLineItems: IStockTransferLineItem[] = await Promise.all(
      (lineItems as LineItemInput[]).map(async (item) => {
        const product = item.productId ? productMap.get(item.productId) : null;
        let name = item.name ?? item.productName ?? '';
        let sku = item.sku ?? '';
        if ((!name || !sku) && product) {
          name = name || product.name;
          sku = sku || product.sku;
        }
        const packagingBreakdown = buildPackagingBreakdown(
          item.quantity,
          item.packagingBreakdown,
          (product?.packaging?.configurations ?? []).map((config) => ({
            packagingTypeId: config.packagingTypeId,
            unitsPerPackage: config.unitsPerPackage,
          }))
        );

        return {
          ...item,
          name,
          sku,
          packagingBreakdown,
        } as IStockTransferLineItem;
      })
    );

    const totalQuantity = enrichedLineItems.reduce((sum, item) => sum + item.quantity, 0);

    const newTransfer = new StockTransfer({
      transferredAt: transferredAt ?? new Date(),
      sourceBranchId,
      sourceBranchNameSnapshot,
      destinationBranchId,
      destinationBranchNameSnapshot,
      transferredBy,
      transferredByUserId,
      transferredByNameSnapshot,
      lineItems: enrichedLineItems,
      status: status ?? 'completed',
      totalQuantity,
    });

    await newTransfer.save({ session });

    if (status === 'completed') {
      // Fetch source branch name so we can match stock keys stored as branch name
      const sourceBranchName = sourceBranch?.name;

      for (const item of enrichedLineItems) {
        if (item.productId) {
          const product = await Product.findById(item.productId).session(session);
          if (product) {
            // Resolve actual key the stock is stored under (could be branch name or branch ID)
            const stockMap = product.stock as Map<string, number>;
            const sourceKey = stockMap.has(sourceBranchId)
              ? sourceBranchId
              : sourceBranchName && stockMap.has(sourceBranchName)
              ? sourceBranchName
              : null;

            if (sourceKey) {
              const currentSourceStock = stockMap.get(sourceKey) ?? 0;
              const newSourceStock = Math.max(0, currentSourceStock - item.quantity);
              product.stock.set(sourceKey, newSourceStock);
            }

            // Always write destination stock keyed by branch ID for consistency
            const currentDestStock = product.stock.get(destinationBranchId) ?? 0;
            product.stock.set(destinationBranchId, currentDestStock + item.quantity);

            await product.save({ session });
          }
        }
      }

      // Audit Log
      await AuditLog.create([{
        iconKind: 'transfer',
        title: `Stock Transfer - ${totalQuantity} items`,
        actorName: transferredBy,
        occurredAt: new Date(transferredAt),
        category: 'transfer',
        branchId: sourceBranchId,
        metadata: { transferId: newTransfer._id, destinationBranchId }
      }], { session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: newTransfer });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const getTransfers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query: Record<string, unknown> = {};
    if (!req.query.includeDeleted) {
      query.deletedAt = null;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.branchId) {
      query.$or = [
        { sourceBranchId: req.query.branchId },
        { destinationBranchId: req.query.branchId },
      ];
    }

    if (req.query.startDate || req.query.endDate) {
      const dateQuery: Record<string, Date> = {};
      if (req.query.startDate) dateQuery.$gte = new Date(req.query.startDate as string);
      if (req.query.endDate) dateQuery.$lte = new Date(req.query.endDate as string);
      query.transferredAt = dateQuery;
    }

    if (req.query.productName) {
      query['lineItems.name'] = { $regex: req.query.productName, $options: 'i' };
    }

    if (req.query.transferredBy) {
      query.transferredBy = { $regex: req.query.transferredBy, $options: 'i' };
    }

    const { page, limit } = getPagination(req);
    let total: number | undefined;
    let queryBuilder = StockTransfer.find(query as Record<string, unknown>);

    if (page && limit) {
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(limit);
      total = await StockTransfer.countDocuments(query as Record<string, unknown>);
    }

    const transfers = await queryBuilder.lean();
    res.status(200).json({
      success: true,
      data: transfers,
      ...(page && limit && { meta: { total, page, limit } }),
    });
  } catch (error) {
    next(error);
  }
};

export const getTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id).lean();
    if (!transfer) throw new AppError('Stock transfer not found', 404);
    res.status(200).json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
};

export const updateTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transfer = await StockTransfer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!transfer) throw new AppError('Stock transfer not found', 404);
    res.status(200).json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
};

export const deleteTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transfer = await StockTransfer.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true }
    );
    if (!transfer) throw new AppError('Stock transfer not found', 404);
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};
