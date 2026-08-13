import mongoose, { Schema, Document } from 'mongoose';
import { SyncBase, baseSchemaOptions } from '../../utils/schemaBase.js';

export const DAMAGE_CAUSES = ['broken', 'expired', 'spoilage', 'damage', 'theft', 'other'] as const;
export type DamageCause = typeof DAMAGE_CAUSES[number];

export interface IDamage extends Document<string> {
  _id: string;
  damagedAt: Date;
  productId?: string;
  productName: string;
  specs?: string;
  imageUrl?: string;
  quantity: number;
  unitCost: number;
  totalLoss: number;
  cause: DamageCause;
  loggedBy: string;
  notes?: string;
  branchId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const DamageSchema = new Schema<IDamage>(
  {
    ...SyncBase,
    damagedAt: { type: Date, required: true },
    productId: { type: String },
    productName: { type: String, required: true },
    specs: { type: String },
    imageUrl: { type: String },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true },
    totalLoss: { type: Number, required: true },
    cause: { type: String, enum: DAMAGE_CAUSES, required: true },
    loggedBy: { type: String, required: true },
    notes: { type: String },
    branchId: { type: String },
  },
  baseSchemaOptions
);

// Indexes
DamageSchema.index({ branchId: 1, damagedAt: 1 });
DamageSchema.index({ updatedAt: 1 });

export const Damage = mongoose.model<IDamage>('Damage', DamageSchema);
