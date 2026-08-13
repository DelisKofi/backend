import { describe, expect, it } from '@jest/globals';
import {
  buildSkuPrefix,
  generateProductSku,
  isSystemGeneratedSku,
  normalizeSkuForComparison,
} from './productSku.js';

describe('productSku utility', () => {
  it('builds a normalized prefix from the product name', () => {
    expect(buildSkuPrefix('Fresh Milk 500ml')).toBe('FRESH-MILK');
  });

  it('generates a sku with a normalized prefix and suffix', () => {
    const sku = generateProductSku('Fresh Milk 500ml');
    expect(sku).toMatch(/^FRESH-MILK-[A-Z0-9]{6}$/);
  });

  it('detects system generated sku format', () => {
    expect(isSystemGeneratedSku('FRESH-MILK-ABC123')).toBe(true);
    expect(isSystemGeneratedSku('manual-sku')).toBe(false);
  });

  it('normalizes skus for comparison', () => {
    expect(normalizeSkuForComparison('  sku-123  ')).toBe('SKU-123');
  });
});
