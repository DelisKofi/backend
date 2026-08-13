import mongoose, { Schema, Document } from 'mongoose';
import { SyncBase, baseSchemaOptions } from '../../utils/schemaBase.js';

export const EXPENSE_CATEGORIES = [
  'Electricity',
  'Transport',
  'Rent',
  'Packaging',
  'Maintenance',
  'Wastage',
  'Others',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface IExpense extends Document<string> {
  _id: string;
  spentAt: Date;
  category: ExpenseCategory;
  description?: string;
  amount: number;
  source: 'store_till' | 'external';
  loggedBy: string;
  branchId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    ...SyncBase,
    spentAt: { type: Date, required: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    description: { type: String },
    amount: { type: Number, required: true },
    source: { type: String, enum: ['store_till', 'external'], required: true },
    loggedBy: { type: String, required: true },
    branchId: { type: String },
  },
  baseSchemaOptions
);

// Indexes
ExpenseSchema.index({ branchId: 1, spentAt: 1 });
ExpenseSchema.index({ updatedAt: 1 });

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);
