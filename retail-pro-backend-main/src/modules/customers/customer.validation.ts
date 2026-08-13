import { z } from 'zod';

const tierEnum = z.enum(['retail', 'wholesale', 'vip'], {
  message: 'Select a customer tier',
});

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  email: z.string().email('Invalid email address'),
  tier: tierEnum,
  totalPurchases: z.coerce.number().nonnegative().optional(),
  lastPurchaseDate: z.preprocess(
    (value) => (value ? new Date(value as string) : undefined),
    z.date().optional()
  ),
  branchId: z.string().min(1).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();
