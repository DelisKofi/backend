import { z } from 'zod';

const paymentLineMethodEnum = z.enum(['cash', 'card', 'momo', 'credit']);
const transactionPaymentMethodEnum = z.enum([
  'cash',
  'card',
  'momo',
  'credit',
  'split',
]);
const transactionStatusEnum = z.enum(['completed', 'pending', 'cancelled', 'draft', 'voided']);

const transactionPaymentSchema = z.object({
  method: paymentLineMethodEnum,
  amount: z.coerce.number().positive('Payment amount must be greater than 0'),
});

const packagingBreakdownSchema = z.object({
  packagingTypeId: z.string().min(1),
  packagingTypeName: z.string().min(1),
  count: z.coerce.number().nonnegative(),
  unitsPerPackage: z.coerce.number().positive(),
});

const transactionItemSchema = z
  .object({
    productId: z.string().min(1, 'Product id is required'),
    productName: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
    price: z.coerce.number().nonnegative().optional(),
    unitPrice: z.coerce.number().nonnegative().optional(),
    sku: z.string().optional(),
    imageUrl: z.string().optional(),
    packagingBreakdown: z.array(packagingBreakdownSchema).optional(),
    singles: z.coerce.number().nonnegative().optional(),
    totalUnits: z.coerce.number().nonnegative().optional(),
  })
  .refine((value) => Boolean(value.productName || value.name), {
    message: 'Product name is required',
    path: ['productName'],
  })
  .refine((value) => value.price !== undefined || value.unitPrice !== undefined, {
    message: 'Price is required',
    path: ['price'],
  });

type TransactionPaymentInput = {
  method: z.infer<typeof paymentLineMethodEnum>;
  amount: number;
};
type TransactionItemInput = {
  productId: string;
  productName?: string | undefined;
  name?: string | undefined;
  quantity: number;
  price?: number | undefined;
  unitPrice?: number | undefined;
  sku?: string | undefined;
  imageUrl?: string | undefined;
  packagingBreakdown?: Array<{
    packagingTypeId: string;
    packagingTypeName: string;
    count: number;
    unitsPerPackage: number;
  }> | undefined;
  singles?: number | undefined;
  totalUnits?: number | undefined;
};
type TransactionInputDraft = {
  customerId?: string | null | undefined;
  branchId: string;
  date?: Date | undefined;
  status?: z.infer<typeof transactionStatusEnum> | undefined;
  items: TransactionItemInput[];
  payments?: TransactionPaymentInput[] | undefined;
  paymentMethod?: z.infer<typeof transactionPaymentMethodEnum> | undefined;
  amountReceived?: number | undefined;
  taxRate?: number | undefined;
  tax?: number | undefined;
  subtotal?: number | undefined;
  amount?: number | undefined;
  idempotencyKey?: string | undefined;
};

const roundToCents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const buildTransactionDraft = (
  value: TransactionInputDraft
) => {
  const normalizedItems = value.items.map((item) => {
    const unitPrice = item.unitPrice ?? item.price ?? 0;
    const lineTotal = item.price ?? unitPrice * item.quantity;

    return {
      productId: item.productId,
      productName: item.productName ?? item.name ?? '',
      name: item.name,
      quantity: item.quantity,
      price: lineTotal,
      unitPrice,
      sku: item.sku,
      imageUrl: item.imageUrl,
      packagingBreakdown: item.packagingBreakdown,
      singles: item.singles,
      totalUnits: item.totalUnits,
    };
  });

  const computedSubtotal = normalizedItems.reduce(
    (sum, item) => sum + item.price,
    0
  );
  const taxRate = value.taxRate ?? 0;
  const computedTax = computedSubtotal * taxRate;
  const computedAmount = computedSubtotal + computedTax;
  const amount = value.amount ?? computedAmount;

  const payments =
    value.payments && value.payments.length > 0
      ? value.payments.map((payment) => ({
          method: payment.method,
          amount: payment.amount,
        }))
      : value.paymentMethod && value.paymentMethod !== 'split'
        ? [
            {
              method: value.paymentMethod,
              amount: value.amountReceived ?? amount,
            },
          ]
        : [];
  const [firstPayment] = payments;

  const paymentMethod =
    payments.length === 1
      ? (firstPayment?.method ?? value.paymentMethod ?? 'cash')
      : payments.length > 1
        ? 'split'
        : value.paymentMethod ?? 'cash';

  const amountReceived = roundToCents(
    payments.reduce((sum, payment) => (
      payment.method === 'credit' ? sum : sum + payment.amount
    ), 0)
  );
  const creditTotal = roundToCents(
    payments.reduce((sum, payment) => (
      payment.method === 'credit' ? sum + payment.amount : sum
    ), 0)
  );

  return {
    normalizedItems,
    computedSubtotal,
    computedTax,
    computedAmount,
    amount,
    payments,
    paymentMethod,
    amountReceived,
    creditTotal,
  };
};

const dateField = z.preprocess(
  (value) => {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : parsed;
    }
    return value;
  },
  z.date().optional()
);

const transactionInputSchema = z.object({
  customerId: z.string().min(1).nullable().optional(),
  branchId: z.string().min(1, 'Branch is required'),
  date: dateField,
  status: transactionStatusEnum.optional(),
  items: z.array(transactionItemSchema).min(1, 'At least one item is required'),
  payments: z.array(transactionPaymentSchema).min(1, 'At least one payment is required').optional(),
  paymentMethod: transactionPaymentMethodEnum.optional(),
  amountReceived: z.coerce.number().nonnegative().optional(),
  taxRate: z.coerce.number().nonnegative().optional(),
  tax: z.coerce.number().nonnegative().optional(),
  subtotal: z.coerce.number().nonnegative().optional(),
  amount: z.coerce.number().nonnegative().optional(),
  idempotencyKey: z.string().min(1).optional(),
});

export const createTransactionSchema = transactionInputSchema.superRefine((value, ctx) => {
  const draft = buildTransactionDraft(value);
  const hasPayments = draft.payments.length > 0;

  if (!hasPayments) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['payments'],
      message:
        value.paymentMethod === 'split'
          ? 'Split payments require a payments array with one line per method'
          : 'At least one payment is required',
    });
    return;
  }

  const seenMethods = new Set<string>();
  for (let index = 0; index < draft.payments.length; index += 1) {
    const payment = draft.payments[index]!;
    if (seenMethods.has(payment.method)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['payments', index, 'method'],
        message: 'Only one payment line per method is allowed',
      });
    }
    seenMethods.add(payment.method);
  }

  const paymentTotal = roundToCents(
    draft.payments.reduce((sum, payment) => sum + payment.amount, 0)
  );
  if (Math.abs(paymentTotal - roundToCents(draft.amount)) > 0.01) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['payments'],
      message: 'Payment allocation must match sale total',
    });
  }

  if (draft.creditTotal > 0 && !value.customerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['customerId'],
      message: 'Customer is required when payment includes credit',
    });
  }
}).transform((value) => {
  const draft = buildTransactionDraft(value);

  return {
    customerId: value.customerId ?? null,
    branchId: value.branchId,
    date: value.date ?? new Date(),
    status: value.status ?? 'completed',
    items: draft.normalizedItems,
    payments: draft.payments,
    paymentMethod: draft.paymentMethod,
    amountReceived: draft.amountReceived,
    taxRate: value.taxRate ?? 0,
    tax: value.tax ?? draft.computedTax,
    subtotal: value.subtotal ?? draft.computedSubtotal,
    amount: value.amount ?? draft.computedAmount,
    idempotencyKey: value.idempotencyKey,
  };
});

export const updateTransactionSchema = transactionInputSchema.partial();
