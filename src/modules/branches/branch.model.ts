import mongoose, { Schema, Document } from 'mongoose';
import { SyncBase, baseSchemaOptions } from '../../utils/schemaBase.js';

export interface IBranch extends Document<string> {
  _id: string;
  name: string;
  location: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const BranchSchema = new Schema<IBranch>(
  {
    ...SyncBase,
    name: { type: String, required: true },
    location: { type: String, required: true },
    contactEmail: { type: String },
    contactPhone: { type: String },
  },
  baseSchemaOptions
);

// Indexes
BranchSchema.index({ updatedAt: 1 });

export const Branch = mongoose.model<IBranch>('Branch', BranchSchema);
