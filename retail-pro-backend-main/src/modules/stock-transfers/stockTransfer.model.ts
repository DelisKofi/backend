import mongoose, { Schema, Document } from 'mongoose';
import { SyncBase, baseSchemaOptions } from '../../utils/schemaBase.js';

export interface IStockTransferLineItem {
  productId?: string;
  sku: string;
  name: string;
  imageUrl?: string;
  quantity: number;
  packagingBreakdown?: {
    configurations: Array<{
      packagingTypeId: string;
      packagingTypeNameSnapshot: string;
      unitsPerPackageSnapshot: number;
      containerCounts: number[];
      singles: number;
    }>;
    displayBreakdown?: string;
  };
}

export interface IStockTransfer extends Document<string> {
  _id: string;
  transferredAt: Date;
  sourceBranchId: string;
  sourceBranchNameSnapshot?: string;
  destinationBranchId: string;
  destinationBranchNameSnapshot?: string;
  transferredBy: string;
  transferredByUserId?: string;
  transferredByNameSnapshot?: string;
  lineItems: IStockTransferLineItem[];
  status: 'completed' | 'pending' | 'cancelled';
  totalQuantity: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const StockTransferLineItemSchema = new Schema<IStockTransferLineItem>(
  {
    productId: { type: String },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    imageUrl: { type: String },
    quantity: { type: Number, required: true },
    packagingBreakdown: {
      configurations: [
        {
          packagingTypeId: { type: String, required: true },
          packagingTypeNameSnapshot: { type: String, required: true },
          unitsPerPackageSnapshot: { type: Number, required: true, min: 1 },
          containerCounts: [{ type: Number, min: 0, default: 0 }],
          singles: { type: Number, required: true, min: 0, default: 0 },
        },
      ],
      displayBreakdown: { type: String },
    },
  },
  { _id: false }
);

const StockTransferSchema = new Schema<IStockTransfer>(
  {
    ...SyncBase,
    transferredAt: { type: Date, required: true },
    sourceBranchId: { type: String, required: true, ref: 'Branch' },
    sourceBranchNameSnapshot: { type: String },
    destinationBranchId: { type: String, required: true, ref: 'Branch' },
    destinationBranchNameSnapshot: { type: String },
    transferredBy: { type: String, required: true },
    transferredByUserId: { type: String },
    transferredByNameSnapshot: { type: String },
    lineItems: [StockTransferLineItemSchema],
    status: { type: String, enum: ['completed', 'pending', 'cancelled'], default: 'completed' },
    totalQuantity: { type: Number, default: 0 },
  },
  baseSchemaOptions
);

// Indexes
StockTransferSchema.index({ sourceBranchId: 1 });
StockTransferSchema.index({ destinationBranchId: 1 });
StockTransferSchema.index({ transferredAt: 1 });
StockTransferSchema.index({ updatedAt: 1 });

export const StockTransfer = mongoose.model<IStockTransfer>('StockTransfer', StockTransferSchema);
