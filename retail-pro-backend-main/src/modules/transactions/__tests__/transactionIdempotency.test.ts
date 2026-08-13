import { describe, expect, it } from '@jest/globals';
import {
  buildIdempotencyFingerprint,
  fingerprintFromStoredTransaction,
  idempotencyPayloadMatches,
} from '../transactionIdempotency.js';

const basePayload = {
  branchId: 'branch-1',
  customerId: null,
  date: new Date('2026-05-31T12:00:00.000Z'),
  status: 'completed',
  amount: 100,
  subtotal: 90,
  tax: 10,
  taxRate: 0.1,
  items: [
    {
      productId: 'prod-1',
      quantity: 2,
      price: 90,
      unitPrice: 45,
    },
  ],
  payments: [{ method: 'cash', amount: 100 }],
};

describe('transactionIdempotency', () => {
  it('produces the same fingerprint for equivalent payloads', () => {
    const a = buildIdempotencyFingerprint(basePayload);
    const b = buildIdempotencyFingerprint({
      ...basePayload,
      date: '2026-05-31T12:00:00.000Z',
    });
    expect(a).toBe(b);
  });

  it('detects payload mismatch for the same idempotency key', () => {
    const stored = {
      ...basePayload,
      payments: [{ method: 'cash', amount: 100 }],
    };
    const incoming = {
      ...basePayload,
      amount: 200,
      payments: [{ method: 'cash', amount: 200 }],
    };
    expect(idempotencyPayloadMatches(stored, incoming)).toBe(false);
  });

  it('matches stored transaction documents', () => {
    const stored = {
      branchId: 'branch-1',
      customerId: null,
      date: new Date('2026-05-31T12:00:00.000Z'),
      status: 'completed',
      amount: 100,
      subtotal: 90,
      tax: 10,
      taxRate: 0.1,
      items: basePayload.items,
      payments: [{ method: 'cash', amount: 100 }],
    };
    expect(fingerprintFromStoredTransaction(stored)).toBe(
      buildIdempotencyFingerprint(basePayload)
    );
  });
});
