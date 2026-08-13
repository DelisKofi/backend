import { z } from 'zod';

export const createBranchSchema = z.object({
  name: z.string().min(2, 'Branch name is required'),
  location: z.string().min(2, 'Branch location is required'),
  contactEmail: z.string().email('Invalid email address').optional(),
  contactPhone: z.string().min(1).optional(),
});

export const updateBranchSchema = createBranchSchema.partial();
