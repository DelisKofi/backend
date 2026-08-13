import { z } from 'zod';

export const debtTypeEnum = z.enum(['receivable', 'payable']);
export const statusEnum = z.enum(['open', 'partial', 'settled']);

const money = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return v;
  return typeof v === 'string' ? Number.parseFloat(v.replace(/,/g, '')) : v;
}, z.number().positive('Amount must be greater than 0'));

export const createDebtSchema = z.object({
  type: debtTypeEnum,
  customerId: z.string().optional(),
  partyName: z.string().min(1, 'Party name is required'),
  partyPhone: z.string().optional(),
  partyEmail: z.string().email('Invalid email').optional(),
  reference: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  amount: money,
  source: z.enum(['manual', 'pos']).optional(),
  transactionId: z.string().optional(),
  dueDate: z.preprocess((v) => (v ? new Date(v as string) : undefined), z.date().optional()),
  branchId: z.string().optional(),
  notes: z.string().optional(),
});

export const updateDebtSchema = createDebtSchema.partial().extend({
  status: statusEnum.optional(),
});

export const paymentSchema = z.object({
  amount: z.preprocess((v) => (typeof v === 'string' ? Number.parseFloat(v) : v), z.number().positive('Payment must be greater than 0')),
  paidAt: z.preprocess((v) => new Date(v as string), z.date()),
  note: z.string().optional(),
});

export type CreateDebtInput = z.infer<typeof createDebtSchema>;
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
