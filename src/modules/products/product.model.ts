import mongoose, { Schema, Document } from 'mongoose';
import { SyncBase, baseSchemaOptions } from '../../utils/schemaBase.js';

export interface IProduct extends Document<string> {
  _id: string;
  branch?: string;
  branchId?: string;
  name: string;
  specs?: string;
  sku: string;
  category?: string;
  cost: number;
  wholesale?: number;
  retail: number;
  imageUrl?: string;
  imageUrls?: string[];
  unitBarcode?: string;
  lowStockThreshold?: number;
  packaging: {
    enabled: boolean;
    configurations: {
      packagingTypeId: string;
      unitsPerPackage: number;
      barcode?: string;
    }[];
  };
  stock: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const ProductSchema = new Schema<IProduct>(
  {
    ...SyncBase,
    branch: { type: String },
    name: { type: String, required: true },
    specs: { type: String },
    sku: { type: String, required: true, unique: true },
    category: { type: String },
    cost: { type: Number, required: true },
    wholesale: { type: Number },
    retail: { type: Number, required: true },
    imageUrl: { type: String },
    imageUrls: [{ type: String }],
    unitBarcode: { type: String },
    lowStockThreshold: { type: Number },
    packaging: {
      enabled: { type: Boolean, default: false },
      configurations: [
        {
          packagingTypeId: { type: String, required: true, ref: 'PackagingType' },
          unitsPerPackage: { type: Number, required: true, min: 1 },
          barcode: { type: String },
        },
      ],
    },
    stock: { type: Map, of: Number, default: {} },
  },
  baseSchemaOptions
);

// Indexes
ProductSchema.index({ category: 1 });
ProductSchema.index({ updatedAt: 1 });
ProductSchema.index({ name: 'text' });
ProductSchema.index({ unitBarcode: 1 }, { sparse: true });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
