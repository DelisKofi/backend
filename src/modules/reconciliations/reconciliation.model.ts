import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { baseSchemaOptions } from '../../utils/schemaBase.js';

export type ReconciliationStatus = 'Open' | 'Closed';

export interface IDailyReconciliation extends Document<string> {
  _id: string;
  branchId: string;
  date: string;
  status: ReconciliationStatus;
  expectedCash: number;
  expectedCard: number;
  expectedMomo: number;
  creditSales: number;
  totalSales: number;
  actualCash?: number;
  actualCard?: number;
  actualMomo?: number;
  variance?: number;
  notes?: string;
  snapshotAt?: Date;
  openedAt: Date;
  closedAt?: Date;
  closedBy?: string;
  reopenedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DailyReconciliationSchema = new Schema<IDailyReconciliation>(
  {
    _id: { type: String, default: () => uuidv4() },
    branchId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    status: { type: String, enum: ['Open', 'Closed'], required: true, default: 'Open' },
    expectedCash: { type: Number, required: true, default: 0 },
    expectedCard: { type: Number, required: true, default: 0 },
    expectedMomo: { type: Number, required: true, default: 0 },
    creditSales: { type: Number, required: true, default: 0 },
    totalSales: { type: Number, required: true, default: 0 },
    actualCash: { type: Number },
    actualCard: { type: Number },
    actualMomo: { type: Number },
    variance: { type: Number },
    notes: { type: String },
    snapshotAt: { type: Date },
    openedAt: { type: Date, required: true },
    closedAt: { type: Date },
    closedBy: { type: String },
    reopenedAt: { type: Date },
  },
  baseSchemaOptions
);

DailyReconciliationSchema.index({ branchId: 1, date: 1 }, { unique: true });
DailyReconciliationSchema.index({ branchId: 1, status: 1, date: -1 });

export const DailyReconciliation = mongoose.model<IDailyReconciliation>(
  'DailyReconciliation',
  DailyReconciliationSchema
);
