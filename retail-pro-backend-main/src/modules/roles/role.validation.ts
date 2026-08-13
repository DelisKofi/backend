import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
  permissions: z.record(z.string(), z.any()).optional(),
  allAccess: z.boolean().default(false),
  allBranches: z.boolean().default(false),
});

export const updateRoleSchema = createRoleSchema.partial();
