import { z } from 'zod';

export const createPackagingTypeSchema = z.object({
  name: z.string().trim().min(1, 'Packaging type name is required'),
});

export const updatePackagingTypeSchema = z.object({
  name: z.string().trim().min(1, 'Packaging type name is required'),
});
