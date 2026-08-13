import { describe, expect, it } from '@jest/globals';
import { closeSchema, startEodSchema, listQuerySchema } from '../reconciliation.validation.js';

describe('reconciliation.validation', () => {
  it('parses close body with actual amounts', () => {
    const result = closeSchema.safeParse({
      actualAmounts: { cash: 1400, card: 640, momo: 480 },
      notes: 'All good',
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative actual amounts', () => {
    const result = closeSchema.safeParse({
      actualAmounts: { cash: -1, card: 0, momo: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('parses start EOD with branch only', () => {
    const result = startEodSchema.safeParse({ branchId: 'branch-1' });
    expect(result.success).toBe(true);
  });

  it('parses list query with hasVariance boolean string', () => {
    const result = listQuerySchema.safeParse({
      branchId: 'branch-1',
      hasVariance: 'true',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hasVariance).toBe(true);
    }
  });
});
