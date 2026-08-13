import { z } from 'zod';

export const INVENTORY_PRODUCT_CATEGORIES = [
  'Electronics',
  'Accessories',
  'Groceries',
  'Beverages',
] as const;

const categoryEnum = z.enum(INVENTORY_PRODUCT_CATEGORIES);

const moneyField = (message: string) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? 0 : value),
    z.coerce.number().nonnegative(message)
  );

const stockQuantityField = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? 0 : value),
  z.coerce.number().int().nonnegative('Stock quantity must be zero or greater')
);

const lowStockThresholdField = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? 1 : value),
  z.coerce.number().int().min(1, 'Low stock threshold must be at least 1')
);

const baseProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required').optional(),
  name: z.string().min(2, 'Product name is required'),
  description: z.string().max(2000).optional().default(''),
  category: categoryEnum,
  branch: z.string().min(1, 'Select a branch').optional(),
  branchId: z.string().min(1).optional(),
  cost: moneyField('Cost must be zero or greater'),
  retailPrice: moneyField('Retail price must be zero or greater'),
  wholesalePrice: moneyField('Wholesale price must be zero or greater'),
  unitBarcode: z.string().optional().default(''),
  stockQuantity: stockQuantityField.optional(),
  lowStockThreshold: lowStockThresholdField.optional(),
  packaging: z
    .object({
      enabled: z.boolean().default(false),
      configurations: z.array(
        z.object({
          packagingTypeId: z.string().min(1, 'Packaging type ID is required'),
          unitsPerPackage: z.coerce.number().int().min(1, 'Units per package must be at least 1'),
          barcode: z.string().optional(),
        })
      ).default([]),
    })
    .refine(data => !data.enabled || data.configurations.length > 0, {
      message: 'At least one packaging configuration is required when enabled',
      path: ['configurations'],
    })
    .optional(),
  imageDataUrls: z.array(z.string()).max(5, 'Maximum 5 images').optional(),
  imageUrls: z.array(z.string()).max(5, 'Maximum 5 images').optional(),
  imageUrl: z.string().optional(),
});

export const createProductSchema = baseProductSchema
  .omit({ sku: true })
  .refine((value) => Boolean(value.branch || value.branchId), {
    message: 'Branch is required',
    path: ['branch'],
  });

export const updateProductSchema = baseProductSchema.partial();

export const linkProductBranchSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  stockQuantity: stockQuantityField.optional().default(0),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type LinkProductBranchInput = z.infer<typeof linkProductBranchSchema>;
