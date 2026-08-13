import { z } from 'zod';
import { DAMAGE_CAUSES } from './damage.model.js';

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

const damageInputSchema = z.object({
  damagedAt: dateField,
  productId: z.string().min(1).optional(),
  productName: z.string().min(1, 'Product name is required'),
  specs: z.string().optional(),
  imageUrl: z.string().optional(),
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
  unitCost: z.coerce.number().nonnegative('Unit cost must be zero or greater'),
  totalLoss: z.coerce.number().nonnegative().optional(),
  cause: z.enum(DAMAGE_CAUSES, { message: 'Select a valid cause' }),
  notes: z.string().optional(),
  branchId: z.string().min(1).optional(),
});

export const createDamageSchema = damageInputSchema.transform((value) => ({
  ...value,
  totalLoss: value.totalLoss ?? value.quantity * value.unitCost,
}));

export const updateDamageSchema = damageInputSchema.partial().transform((value) => {
  const payload: Record<string, unknown> = { ...value };
  if (value.quantity !== undefined && value.unitCost !== undefined) {
    payload.totalLoss = value.totalLoss ?? value.quantity * value.unitCost;
  }
  return payload;
});
