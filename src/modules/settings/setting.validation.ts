import { z } from 'zod';

export const updateGlobalSettingSchema = z.object({
  currency: z.string().min(1).optional(),
  lowStockThresholdFallback: z.coerce.number().min(0).optional(),
  requireManagerPriceOverride: z.boolean().optional(),
  receiptFooterText: z.string().optional(),
  shopName: z.string().optional(),
});
