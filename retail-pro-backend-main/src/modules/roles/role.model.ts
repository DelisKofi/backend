import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { baseSchemaOptions } from '../../utils/schemaBase.js';

export interface IRole extends Document<string> {
  _id: string;
  name: string;
  description?: string;
  permissions: mongoose.Schema.Types.Mixed;
  allAccess: boolean;
  allBranches: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const RoleSchema = new Schema<IRole>(
  {
    _id: { type: String, default: () => uuidv4() },
    name: { type: String, required: true },
    description: { type: String },
    allAccess: { type: Boolean, default: false },
    allBranches: { type: Boolean, default: false },
    permissions: { type: Schema.Types.Mixed, default: {} },
    deletedAt: { type: Date, default: null },
  },
  baseSchemaOptions
);

export const Role = mongoose.model<IRole>('Role', RoleSchema);
