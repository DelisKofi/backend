import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { baseSchemaOptions } from '../../utils/schemaBase.js';

export interface IInvitation extends Document<string> {
  _id: string;
  email: string;
  roleId: string;
  branchIds: string[];
  tokenHash: string;
  expiresAt: Date;
  invitedBy: string;
  acceptedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    _id: { type: String, default: () => uuidv4() },
    email: { type: String, required: true },
    roleId: { type: String, required: true, ref: 'Role' },
    branchIds: [{ type: String, ref: 'Branch' }],
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    invitedBy: { type: String, required: true, ref: 'User' },
    acceptedAt: { type: Date, default: null },
  },
  baseSchemaOptions
);

export const Invitation = mongoose.model<IInvitation>('Invitation', InvitationSchema);
