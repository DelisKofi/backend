import mongoose, { Schema, Document } from 'mongoose';
import { SyncBase, baseSchemaOptions } from '../../utils/schemaBase.js';

export interface IGlobalSetting extends Document<string> {
  _id: string;
  currency: string;
  lowStockThresholdFallback: number;
  requireManagerPriceOverride: boolean;
  receiptFooterText: string;
  shopName: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const GlobalSettingSchema = new Schema<IGlobalSetting>(
  {
    ...SyncBase,
    currency: { type: String, default: 'GHS' },
    lowStockThresholdFallback: { type: Number, default: 5 },
    requireManagerPriceOverride: { type: Boolean, default: false },
    receiptFooterText: { type: String, default: 'Thank you for your business!' },
    shopName: { type: String, default: 'My Shop' },
  },
  baseSchemaOptions
);

// We will only ever have one global setting document, but we index updatedAt just in case
GlobalSettingSchema.index({ updatedAt: 1 });

export const GlobalSetting = mongoose.model<IGlobalSetting>('GlobalSetting', GlobalSettingSchema);
