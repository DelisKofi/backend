import { describe, expect, it } from '@jest/globals';
import {
  buildDedupeQuery,
  getLinkedBranchIds,
  isBranchLinked,
  parseDedupeLimit,
  parseDedupeSearchFlag,
  toDedupeCandidate,
} from '../productDedupe.js';
import { linkProductBranchSchema } from '../product.validation.js';

describe('productDedupe', () => {
  describe('parseDedupeSearchFlag', () => {
    it('accepts common truthy values', () => {
      expect(parseDedupeSearchFlag('true')).toBe(true);
      expect(parseDedupeSearchFlag('1')).toBe(true);
      expect(parseDedupeSearchFlag(true)).toBe(true);
      expect(parseDedupeSearchFlag('false')).toBe(false);
    });
  });

  describe('parseDedupeLimit', () => {
    it('defaults and caps dedupe limits', () => {
      expect(parseDedupeLimit(undefined)).toBe(20);
      expect(parseDedupeLimit('100')).toBe(50);
      expect(parseDedupeLimit('10')).toBe(10);
    });
  });

  describe('buildDedupeQuery', () => {
    it('builds name-only query', () => {
      const result = buildDedupeQuery({ name: 'Milk' });
      expect(result?.matchReason).toBe('name');
      expect(result?.query).toEqual({
        deletedAt: null,
        name: { $regex: 'Milk', $options: 'i' },
      });
    });

    it('builds barcode-only query', () => {
      const result = buildDedupeQuery({ barcode: 'ABC-123' });
      expect(result?.matchReason).toBe('barcode');
      expect(result?.query.deletedAt).toBe(null);
      expect(result?.query.$or).toHaveLength(2);
    });

    it('builds combined name and barcode query with AND', () => {
      const result = buildDedupeQuery({ name: 'Milk', barcode: 'ABC-123' });
      expect(result?.matchReason).toBe('both');
      expect(result?.query.$and).toHaveLength(2);
    });

    it('returns null when no search terms provided', () => {
      expect(buildDedupeQuery({})).toBeNull();
    });
  });

  describe('branch link helpers', () => {
    it('reads linked branch ids from stock map', () => {
      expect(getLinkedBranchIds({ a: 1, b: 0 })).toEqual(['a', 'b']);
      expect(isBranchLinked({ a: 1 }, 'a')).toBe(true);
      expect(isBranchLinked({ a: 1 }, 'b')).toBe(false);
    });
  });

  describe('toDedupeCandidate', () => {
    it('returns slim candidate shape with linked branches', () => {
      const candidate = toDedupeCandidate(
        {
          _id: 'prod-1',
          name: 'Milk',
          sku: 'MILK-123',
          retail: 5,
          unitBarcode: '111',
          stock: { branchA: 2, branchB: 0 },
          packaging: { enabled: false, configurations: [] },
        },
        'both'
      );

      expect(candidate).toMatchObject({
        _id: 'prod-1',
        name: 'Milk',
        sku: 'MILK-123',
        linkedBranchIds: ['branchA', 'branchB'],
        matchReason: 'both',
      });
      expect(candidate).not.toHaveProperty('specs');
    });
  });

  describe('linkProductBranchSchema', () => {
    it('parses branch link payload with default stock', () => {
      const result = linkProductBranchSchema.parse({
        branchId: 'c77d56d3-6c47-41d4-99a1-6427377d93ee',
      });
      expect(result).toEqual({
        branchId: 'c77d56d3-6c47-41d4-99a1-6427377d93ee',
        stockQuantity: 0,
      });
    });
  });
});
