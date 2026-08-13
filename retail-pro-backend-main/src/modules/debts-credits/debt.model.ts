import mongoose, { Schema, Document } from 'mongoose';
import { SyncBase, baseSchemaOptions } from '../../utils/schemaBase.js';

export interface IPayment {
  _id?: string;
  amount: number;
  paidAt: Date;
  note?: string;
  recordedBy?: string;
  createdAt?: Date;
}

export interface IDebtCredit extends Document<string> {
  _id: string;
  type: 'receivable' | 'payable';
  customerId?: string;
  partyName: string;
  partyPhone?: string;
  partyEmail?: string;
  reference?: string;
  description: string;
  amount: number;
  paidAmount: number;
  balance: number;
  dueDate?: Date;
  status: 'open' | 'partial' | 'settled';
  branchId?: string;
  notes?: string;
  paymentDirection: 'in' | 'out';
  source?: 'manual' | 'pos';
  transactionId?: string;
  payments: IPayment[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const PaymentSchema = new Schema<IPayment>(
  {
    amount: { type: Number, required: true },
    paidAt: { type: Date, required: true },
    note: { type: String },
    recordedBy: { type: String },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

const DebtCreditSchema = new Schema<IDebtCredit>(
  {
    ...SyncBase,
    type: { type: String, enum: ['receivable', 'payable'], required: true },
    customerId: { type: String, index: true },
    partyName: { type: String, required: true, index: 'text' },
    partyPhone: { type: String },
    partyEmail: { type: String },
    reference: { type: String, index: 'text' },
    description: { type: String, required: true, index: 'text' },
    amount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    dueDate: { type: Date },
    status: { type: String, enum: ['open', 'partial', 'settled'], default: 'open' },
    branchId: { type: String, index: true },
    notes: { type: String },
    paymentDirection: { type: String, enum: ['in', 'out'], required: true },
    source: { type: String, enum: ['manual', 'pos'], default: 'manual' },
    transactionId: { type: String, index: true, unique: true, sparse: true },
    payments: { type: [PaymentSchema], default: [] },
  },
  baseSchemaOptions
);

// Text index for search across relevant fields
DebtCreditSchema.index({ partyName: 'text', reference: 'text', description: 'text', partyPhone: 'text' });
DebtCreditSchema.index({ dueDate: 1 });
DebtCreditSchema.index({ updatedAt: 1 });

export const DebtCredit = mongoose.model<IDebtCredit>('DebtCredit', DebtCreditSchema);
