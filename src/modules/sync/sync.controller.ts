import type { Request, Response, NextFunction } from "express";
import type { Model } from "mongoose";
import { Customer } from "../customers/customer.model.js";
import { Product } from "../products/product.model.js";
import { Branch } from "../branches/branch.model.js";
import { Transaction } from "../transactions/transaction.model.js";
import { Expense } from "../expenses/expense.model.js";
import { Damage } from "../damages/damage.model.js";
import { StockTransfer } from "../stock-transfers/stockTransfer.model.js";

type SyncModel = Model<Record<string, unknown>>;

const SYNC_MODELS: Record<string, SyncModel> = {
  customers: Customer as unknown as SyncModel,
  products: Product as unknown as SyncModel,
  branches: Branch as unknown as SyncModel,
  transactions: Transaction as unknown as SyncModel,
  expenses: Expense as unknown as SyncModel,
  damages: Damage as unknown as SyncModel,
  stockTransfers: StockTransfer as unknown as SyncModel,
};

export const pull = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lastSyncTime = req.query.lastSyncTime
      ? new Date(String(req.query.lastSyncTime))
      : new Date(0);
    const branchId = req.query.branchId
      ? String(req.query.branchId)
      : undefined;

    // We want all documents created, updated, or soft-deleted since lastSyncTime.
    const query: Record<string, unknown> = { updatedAt: { $gt: lastSyncTime } };
    if (branchId) {
      query.branchId = branchId; // Note: For Products/Branches which are global, you might remove branchId query
    }

    const changes: Record<string, unknown[]> = {};
    for (const [key, model] of Object.entries(SYNC_MODELS)) {
      // Specialized overrides if needed: e.g. Products apply globally
      const modelQuery =
        key === "products" || key === "branches"
          ? { updatedAt: { $gt: lastSyncTime } }
          : query;

      changes[key] = await model.find(modelQuery).lean();
    }

    res.status(200).json({
      serverTime: new Date().getTime(),
      changes,
    });
  } catch (error) {
    next(error);
  }
};

type SyncDoc = Record<string, unknown> & { id?: string; _id?: string };
type SyncCollectionChanges = {
  created?: SyncDoc[];
  updated?: SyncDoc[];
  deleted?: Array<string | SyncDoc>;
};

const getSyncDocId = (doc: string | SyncDoc) => {
  if (typeof doc === "string") return doc;
  return (doc.id || doc._id || "") as string;
};

export const push = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { changes } = req.body as { changes?: Record<string, unknown> };
    if (!changes) {
      return res
        .status(400)
        .json({ success: false, message: "No changes provided" });
    }

    for (const [collectionName, collectionChanges] of Object.entries(changes)) {
      const model = SYNC_MODELS[collectionName];
      if (!model) continue;

      const {
        created = [],
        updated = [],
        deleted = [],
      } = collectionChanges as SyncCollectionChanges;

      // Upsert created/updated
      const upserts = [...created, ...updated];
      if (upserts.length > 0) {
        const bulkOps = upserts.map((doc) => ({
          updateOne: {
            filter: { _id: doc.id || doc._id },
            update: { $set: { ...doc, _id: doc.id || doc._id } },
            upsert: true,
          },
        }));
        await model.bulkWrite(bulkOps);
      }

      // Soft delete deleted docs
      if (deleted.length > 0) {
        const deletedIds = deleted.map(getSyncDocId).filter(Boolean);
        await model.updateMany(
          { _id: { $in: deletedIds } },
          { $set: { deletedAt: new Date() } },
        );
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
