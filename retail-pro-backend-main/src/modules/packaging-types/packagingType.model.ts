import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { baseSchemaOptions } from '../../utils/schemaBase.js';

export interface IPackagingType extends Document<string> {
  _id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const PackagingTypeSchema = new Schema<IPackagingType>(
  {
    _id: { type: String, default: () => uuidv4() },
    name: { type: String, required: true, unique: true, trim: true },
  },
  baseSchemaOptions
);

// Indexes
PackagingTypeSchema.index({ name: 1 }, { collation: { locale: 'en', strength: 2 } });

export const PackagingType = mongoose.model<IPackagingType>('PackagingType', PackagingTypeSchema);
