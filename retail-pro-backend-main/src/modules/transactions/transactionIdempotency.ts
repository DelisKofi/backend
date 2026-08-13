import { createHash } from 'crypto';

const roundToCents = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export type IdempotencyTransactionPayload = {
  branchId: string;
  customerId?: string | null;
  date: Date | string;
  status: string;
  amount: number;
  subtotal?: number;
  tax?: number;
  taxRate?: number;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    unitPrice: number;
    packagingBreakdown?: Array<{
      packagingTypeId: string;
      packagingTypeName: string;
      count: number;
      unitsPerPackage: number;
    }> | undefined;
    singles?: number | undefined;
    totalUnits?: number | undefined;
  }>;
  payments: Array<{
    method: string;
    amount: number;
  }>;
};

const normalizePayments = (payments: IdempotencyTransactionPayload['payments']) =>
  [...payments]
    .map((payment) => ({
      method: payment.method,
      amount: roundToCents(payment.amount),
    }))
    .sort((a, b) => a.method.localeCompare(b.method));

const normalizeItems = (items: IdempotencyTransactionPayload['items']) =>
  [...items]
    .map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: roundToCents(item.price),
      unitPrice: roundToCents(item.unitPrice),
      packagingBreakdown: item.packagingBreakdown?.map(pb => ({
        ...pb
      })).sort((a, b) => a.packagingTypeId.localeCompare(b.packagingTypeId)),
      singles: item.singles,
      totalUnits: item.totalUnits,
    }))
    .sort((a, b) => a.productId.localeCompare(b.productId));

export const buildIdempotencyFingerprint = (
  payload: IdempotencyTransactionPayload
): string => {
  const canonical = {
    branchId: payload.branchId,
    customerId: payload.customerId ?? null,
    date: new Date(payload.date).toISOString(),
    status: payload.status,
    amount: roundToCents(payload.amount),
    subtotal: roundToCents(payload.subtotal ?? 0),
    tax: roundToCents(payload.tax ?? 0),
    taxRate: payload.taxRate ?? 0,
    items: normalizeItems(payload.items),
    payments: normalizePayments(payload.payments),
  };

  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
};

const paymentsFromTransaction = (transaction: {
  payments?: Array<{ method: string; amount: number }>;
  paymentMethod?: string;
  amount?: number;
  amountReceived?: number;
}) => {
  const rawPayments = Array.isArray(transaction.payments)
    ? transaction.payments
    : [];
  if (rawPayments.length > 0) {
    return rawPayments.map((payment) => ({
      method: payment.method,
      amount: Number(payment.amount) || 0,
    }));
  }
  if (transaction.paymentMethod) {
    return [
      {
        method: transaction.paymentMethod,
        amount:
          Number(transaction.amountReceived ?? transaction.amount ?? 0) || 0,
      },
    ];
  }
  return [];
};

export type StoredTransactionForIdempotency = {
  branchId: string;
  customerId?: string | null;
  date: Date | string;
  status?: string;
  amount: number;
  subtotal?: number;
  tax?: number;
  taxRate?: number;
  items?: Array<{
    productId: string;
    quantity: number;
    price: number;
    unitPrice: number;
    packagingBreakdown?: Array<{
      packagingTypeId: string;
      packagingTypeName: string;
      count: number;
      unitsPerPackage: number;
    }> | undefined;
    singles?: number | undefined;
    totalUnits?: number | undefined;
  }>;
  payments?: Array<{ method: string; amount: number }>;
  paymentMethod?: string;
  amountReceived?: number;
};

export const fingerprintFromStoredTransaction = (
  transaction: StoredTransactionForIdempotency
): string =>
  buildIdempotencyFingerprint({
    branchId: transaction.branchId,
    customerId: transaction.customerId ?? null,
    date: transaction.date,
    status: transaction.status ?? 'completed',
    amount: transaction.amount,
    subtotal: transaction.subtotal ?? 0,
    tax: transaction.tax ?? 0,
    taxRate: transaction.taxRate ?? 0,
    items: (transaction.items ?? []).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      unitPrice: item.unitPrice,
      packagingBreakdown: item.packagingBreakdown,
      singles: item.singles,
      totalUnits: item.totalUnits,
    })),
    payments: paymentsFromTransaction(transaction),
  });

export const idempotencyPayloadMatches = (
  stored: StoredTransactionForIdempotency,
  incoming: IdempotencyTransactionPayload
): boolean =>
  fingerprintFromStoredTransaction(stored) ===
  buildIdempotencyFingerprint(incoming);
