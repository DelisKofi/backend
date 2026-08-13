import { describe, expect, it } from '@jest/globals';
import { createTransactionSchema } from '../transaction.validation.js';

describe('createTransactionSchema', () => {
  it('accepts split paymentMethod with multi-line payments including credit', () => {
    const result = createTransactionSchema.parse({
      customerId: '480badaf-4db3-413e-9dfe-9fbbddfee701',
      branchId: 'c77d56d3-6c47-41d4-99a1-6427377d93ee',
      date: '2026-05-31T22:45:42.216Z',
      status: 'completed',
      items: [
        {
          productId: '7d759b37-8df4-429b-adfe-505d925284f1',
          productName: 'Samsung Pavilion Laptop 15',
          name: 'Samsung Pavilion Laptop 15',
          quantity: 1,
          unitPrice: 125,
          price: 125,
          sku: 'SAMSUNG-PAVI-UP8FOA',
          imageUrl: '',
        },
      ],
      taxRate: 0,
      tax: 0,
      subtotal: 125,
      amount: 125,
      payments: [
        { method: 'cash', amount: 100 },
        { method: 'momo', amount: 20 },
        { method: 'credit', amount: 5 },
      ],
      amountReceived: 120,
      paymentMethod: 'split',
    });

    expect(result.paymentMethod).toBe('split');
    expect(result.amountReceived).toBe(120);
    expect(result.payments).toEqual([
      { method: 'cash', amount: 100 },
      { method: 'momo', amount: 20 },
      { method: 'credit', amount: 5 },
    ]);
  });

  it('rejects split on a payment line', () => {
    expect(() =>
      createTransactionSchema.parse({
        branchId: 'c77d56d3-6c47-41d4-99a1-6427377d93ee',
        items: [
          {
            productId: '7d759b37-8df4-429b-adfe-505d925284f1',
            productName: 'Test',
            quantity: 1,
            price: 10,
            unitPrice: 10,
          },
        ],
        amount: 10,
        payments: [{ method: 'split', amount: 10 }],
      })
    ).toThrow();
  });

  it('rejects paymentMethod split without payments array', () => {
    expect(() =>
      createTransactionSchema.parse({
        branchId: 'c77d56d3-6c47-41d4-99a1-6427377d93ee',
        items: [
          {
            productId: '7d759b37-8df4-429b-adfe-505d925284f1',
            productName: 'Test',
            quantity: 1,
            price: 10,
            unitPrice: 10,
          },
        ],
        amount: 10,
        paymentMethod: 'split',
      })
    ).toThrow(/payments array/i);
  });
});
