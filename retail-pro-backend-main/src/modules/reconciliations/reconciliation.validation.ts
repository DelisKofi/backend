import { z } from 'zod';

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const listQuerySchema = z.object({
  branchId: z.string().min(1),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  status: z.enum(['Open', 'Closed']).optional(),
  hasVariance: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const byDateQuerySchema = z.object({
  branchId: z.string().min(1),
  date: dateStringSchema,
});

export const startEodSchema = z.object({
  branchId: z.string().min(1),
  date: dateStringSchema.optional(),
});

export const closeSchema = z.object({
  actualAmounts: z.object({
    cash: z.coerce.number().min(0),
    card: z.coerce.number().min(0),
    momo: z.coerce.number().min(0),
  }),
  notes: z.string().optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type ByDateQuery = z.infer<typeof byDateQuerySchema>;
export type StartEodBody = z.infer<typeof startEodSchema>;
export type CloseBody = z.infer<typeof closeSchema>;
