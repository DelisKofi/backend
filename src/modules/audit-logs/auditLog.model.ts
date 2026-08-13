import mongoose, { Schema, Document } from 'mongoose';
import { SyncBase, baseSchemaOptions } from '../../utils/schemaBase.js';

export interface IAuditLog extends Document<string> {
  _id: string;
  iconKind: 'sale' | 'transfer' | 'expense' | 'product' | 'user';
  title: string;
  description?: string;
  actorName: string;
  occurredAt: Date;
  category:
    | 'price_override'
    | 'transfer'
    | 'expense'
    | 'sale'
    | 'stock_adjustment'
    | 'product_added'
    | 'product_branch_linked'
    | 'login'
    | 'user_password_reset';
  branchId?: string;
  metadata?: mongoose.Schema.Types.Mixed;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    ...SyncBase,
    iconKind: { type: String, enum: ['sale', 'transfer', 'expense', 'product', 'user'], required: true },
    title: { type: String, required: true },
    description: { type: String },
    actorName: { type: String, required: true },
    occurredAt: { type: Date, required: true },
    category: { 
      type: String, 
      enum: [
        'price_override',
        'transfer',
        'expense',
        'sale',
        'stock_adjustment',
        'product_added',
        'product_branch_linked',
        'login',
        'user_password_reset',
      ],
      required: true 
    },
    branchId: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  baseSchemaOptions
);

// Indexes
AuditLogSchema.index({ occurredAt: -1 });
AuditLogSchema.index({ branchId: 1, occurredAt: 1 });
AuditLogSchema.index({ category: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
