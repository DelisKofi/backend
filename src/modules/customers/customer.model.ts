import mongoose, { Schema, Document } from 'mongoose';
import { SyncBase, baseSchemaOptions } from '../../utils/schemaBase.js';

export interface ICustomer extends Document<string> {
  _id: string;
  branchId?: string;
  name: string;
  phone: string;
  email?: string;
  tier: 'retail' | 'wholesale' | 'vip';
  totalPurchases: number;
  lastPurchaseDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    ...SyncBase,
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    tier: { type: String, enum: ['retail', 'wholesale', 'vip'], default: 'retail' },
    totalPurchases: { type: Number, default: 0 },
    lastPurchaseDate: { type: Date },
  },
  baseSchemaOptions
);

// Indexes
CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ email: 1 }, { sparse: true });
CustomerSchema.index({ updatedAt: 1 });

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
