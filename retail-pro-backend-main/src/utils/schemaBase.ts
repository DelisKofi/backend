import type { SchemaOptions } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const SyncBase = {
  _id: { type: String, default: () => uuidv4() }, // Maps incoming client `id` or generates new UUID
  branchId: { type: String, required: false, index: true },
  deletedAt: { type: Date, default: null },
};

// Configures Mongoose schemas to use native timestamps and standardize `_id` to `id`
export const baseSchemaOptions: any = {
  timestamps: true, 
  toJSON: {
    virtuals: true,
    transform: (_: any, ret: Record<string, any>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_: any, ret: Record<string, any>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    },
  },
};
