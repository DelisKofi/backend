import mongoose, { Schema, Document } from 'mongoose';
import { SyncBase, baseSchemaOptions } from '../../utils/schemaBase.js';

export interface ITransactionPayment {
  method: 'cash' | 'card' | 'momo' | 'credit';
  amount: number;
}

export interface IPackagingBreakdown {
  packagingTypeId: string;
  packagingTypeName: string;
  count: number;
  unitsPerPackage: number;
}

export interface ITransactionItem {
  productId: string;
  productName: string;
  name?: string;
  sku?: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  price: number;
  packagingBreakdown?: IPackagingBreakdown[];
  singles?: number;
  totalUnits?: number;
}

export interface ITransaction extends Document<string> {
  _id: string;
  customerId?: string | null;
  branchId: string;
  date: Date;
  amount: number;
  subtotal?: number;
  tax?: number;
  taxRate?: number;
  paymentMethod?: 'cash' | 'card' | 'momo' | 'credit' | 'split';
  amountReceived?: number;
  payments: ITransactionPayment[];
  linkedReceivableId?: string;
  idempotencyKey?: string;
  status: 'completed' | 'pending' | 'cancelled' | 'draft' | 'voided';
  items: ITransactionItem[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const TransactionPaymentSchema = new Schema<ITransactionPayment>(
  {
    method: { type: String, enum: ['cash', 'card', 'momo', 'credit'], required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const PackagingBreakdownSchema = new Schema<IPackagingBreakdown>(
  {
    packagingTypeId: { type: String, required: true },
    packagingTypeName: { type: String, required: true },
    count: { type: Number, required: true },
    unitsPerPackage: { type: Number, required: true },
  },
  { _id: false }
);

const TransactionItemSchema = new Schema<ITransactionItem>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    name: { type: String },
    sku: { type: String },
    imageUrl: { type: String },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    price: { type: Number, required: true },
    packagingBreakdown: { type: [PackagingBreakdownSchema], default: undefined },
    singles: { type: Number },
    totalUnits: { type: Number },
  },
  { _id: false }
);

const TransactionSchema = new Schema<ITransaction>(
  {
    ...SyncBase,
    customerId: { type: String, required: false, ref: 'Customer' },
    branchId: { type: String, required: true, ref: 'Branch' },
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    subtotal: { type: Number },
    tax: { type: Number },
    taxRate: { type: Number },
    paymentMethod: { type: String, enum: ['cash', 'card', 'momo', 'credit', 'split'] },
    amountReceived: { type: Number },
    payments: { type: [TransactionPaymentSchema], default: [] },
    linkedReceivableId: { type: String, ref: 'DebtCredit' },
    idempotencyKey: { type: String, index: true, unique: true, sparse: true },
    status: { type: String, enum: ['completed', 'pending', 'cancelled', 'draft', 'voided'], default: 'completed' },
    createdBy: { type: String, index: true },
    items: [TransactionItemSchema],
  },
  baseSchemaOptions
);

// Indexes
TransactionSchema.index({ branchId: 1, date: 1 });
TransactionSchema.index({ customerId: 1 });
TransactionSchema.index({ updatedAt: 1 });
TransactionSchema.index({ linkedReceivableId: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
