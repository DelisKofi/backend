import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { baseSchemaOptions } from '../../utils/schemaBase.js';

export interface IUser extends Document<string> {
  _id: string;
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  branchIds: string[];
  status: 'active' | 'invited' | 'disabled';
  isFirstTimeUser: boolean;
  tokenVersion: number;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, default: () => uuidv4() },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String },
    roleId: { type: String, required: true, ref: 'Role' },
    branchIds: [{ type: String, ref: 'Branch' }],
    status: { type: String, enum: ['active', 'invited', 'disabled'], default: 'invited' },
    isFirstTimeUser: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
    lastActiveAt: { type: Date },
    deletedAt: { type: Date, default: null },
  },
  baseSchemaOptions
);

// Indexes
UserSchema.index({ roleId: 1 });
UserSchema.index({ status: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
