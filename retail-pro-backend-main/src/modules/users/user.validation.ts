import { z } from 'zod';

const statusEnum = z.enum(['active', 'invited', 'disabled']);

export const createUserSchema = z.object({
  email: z.string().email('Enter a valid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  roleId: z.string().min(1, 'Role is required'),
  branchIds: z.array(z.string().min(1)).optional(),
  status: statusEnum.optional(),
});

export const updateUserSchema = createUserSchema.partial();

/** Admin reset-password accepts an empty body; server generates the password. */
export const resetUserPasswordSchema = z.object({}).strict();
