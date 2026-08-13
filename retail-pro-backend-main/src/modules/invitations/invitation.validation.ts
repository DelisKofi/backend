import { z } from 'zod';

const inviteRowSchema = z
  .object({
    email: z.string().email('Enter a valid email'),
    roleId: z.string().min(1).optional(),
    roleValue: z.enum(['administrator', 'sales_person', 'viewer']).optional(),
    roleLabel: z.string().optional(),
    branchIds: z.array(z.string().min(1)).optional(),
  })
  .refine((value) => Boolean(value.roleId || value.roleValue), {
    message: 'Role is required',
    path: ['roleId'],
  });

export const createInvitationSchema = z
  .union([
    inviteRowSchema,
    z.array(inviteRowSchema),
    z.object({ invites: z.array(inviteRowSchema) }),
  ])
  .transform((value) => {
    if (Array.isArray(value)) return value;
    if ('invites' in value) return value.invites;
    return [value];
  });
