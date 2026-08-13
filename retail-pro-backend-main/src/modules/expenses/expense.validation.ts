import { z } from 'zod';
import { EXPENSE_CATEGORIES } from './expense.model.js';

const amountField = z.preprocess(
  (value) => {
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value.replace(/,/g, ''));
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  },
  z.number().positive('Enter a valid amount greater than 0')
);

const dateField = z.preprocess(
  (value) => {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : parsed;
    }
    return value;
  },
  z.date().refine((d) => d <= new Date(), { message: 'Date cannot be in the future' })
);

const expenseBaseSchema = z.object({
  cost: amountField.optional(),
  amount: amountField.optional(),
  date: dateField.optional(),
  spentAt: dateField.optional(),
  category: z.enum(EXPENSE_CATEGORIES, { message: 'Select a valid category' }),
  description: z.string().min(1, 'Enter expense details').optional(),
  source: z.enum(['store_till', 'external'] as const, { message: 'Select source of funds' }),
  loggedBy: z.string().min(1).optional(),
  branchId: z.string().min(1).optional(),
});

const expenseInputSchema = expenseBaseSchema.superRefine((value, ctx) => {
  if (value.amount === undefined && value.cost === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Enter a valid amount greater than 0',
      path: ['amount'],
    });
  }

  if (value.spentAt === undefined && value.date === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select a date',
      path: ['spentAt'],
    });
  }
});

export const createExpenseSchema = expenseInputSchema.transform((value) => ({
  amount: value.amount ?? value.cost,
  spentAt: value.spentAt ?? value.date,
  category: value.category,
  description: value.description,
  source: value.source,
  loggedBy: value.loggedBy,
  branchId: value.branchId,
}));

export const updateExpenseSchema = expenseBaseSchema.partial().transform((value) => {
  const payload: Record<string, unknown> = {};
  if (value.amount !== undefined || value.cost !== undefined) {
    payload.amount = value.amount ?? value.cost;
  }
  if (value.spentAt !== undefined || value.date !== undefined) {
    payload.spentAt = value.spentAt ?? value.date;
  }
  if (value.category !== undefined) payload.category = value.category;
  if (value.description !== undefined) payload.description = value.description;
  if (value.source !== undefined) payload.source = value.source;
  if (value.loggedBy !== undefined) payload.loggedBy = value.loggedBy;
  if (value.branchId !== undefined) payload.branchId = value.branchId;
  return payload;
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
