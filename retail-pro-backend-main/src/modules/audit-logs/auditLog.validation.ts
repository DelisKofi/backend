import { z } from 'zod';

const dateField = z.preprocess(
  (value) => {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : parsed;
    }
    return value;
  },
  z.date()
);

export const createAuditLogSchema = z.object({
  iconKind: z.enum(['sale', 'transfer', 'expense', 'product', 'user']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  actorName: z.string().min(1, 'Actor name is required'),
  occurredAt: dateField,
  category: z.enum([
    'price_override',
    'transfer',
    'expense',
    'sale',
    'stock_adjustment',
    'product_added',
    'product_branch_linked',
    'login',
    'user_password_reset',
  ]),
  branchId: z.string().min(1).optional(),
  metadata: z.unknown().optional(),
});

export const updateAuditLogSchema = createAuditLogSchema.partial();
