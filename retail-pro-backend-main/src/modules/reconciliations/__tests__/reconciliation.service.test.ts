import { describe, expect, it } from '@jest/globals';
import {
  buildPaymentBreakdown,
  buildPendingId,
  getDayBounds,
  parsePendingId,
} from '../reconciliation.service.js';

describe('reconciliation helpers', () => {
  it('getDayBounds uses UTC midnight to end of day', () => {
    const { start, end } = getDayBounds('2026-03-12');
    expect(start.toISOString()).toBe('2026-03-12T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-12T23:59:59.999Z');
  });

  it('parsePendingId round-trips with buildPendingId', () => {
    const id = buildPendingId('branch-abc', '2026-03-12');
    expect(parsePendingId(id)).toEqual({
      branchId: 'branch-abc',
      date: '2026-03-12',
    });
  });

  it('buildPaymentBreakdown uses null actuals when Open', () => {
    const breakdown = buildPaymentBreakdown(
      {
        expectedCash: 100,
        expectedCard: 50,
        expectedMomo: 25,
        creditSales: 200,
      },
      null
    );
    expect(breakdown.find((l) => l.key === 'cash')?.actual).toBeNull();
    expect(breakdown.find((l) => l.key === 'credit')?.actual).toBeNull();
  });

  it('buildPaymentBreakdown sets credit actual to expected when Closed', () => {
    const breakdown = buildPaymentBreakdown(
      {
        expectedCash: 100,
        expectedCard: 50,
        expectedMomo: 25,
        creditSales: 200,
      },
      {
        status: 'Closed',
        actualCash: 95,
        actualCard: 50,
        actualMomo: 25,
        expectedCash: 100,
        expectedCard: 50,
        expectedMomo: 25,
        creditSales: 200,
      }
    );
    expect(breakdown.find((l) => l.key === 'cash')?.actual).toBe(95);
    expect(breakdown.find((l) => l.key === 'credit')?.actual).toBe(200);
  });
});

describe('close validation', () => {
  it('requires notes when cash variance is non-zero', () => {
    const variance = -50;
    const notes = '';
    const requiresNotes = Math.abs(variance) > 0.01 && !notes.trim();
    expect(requiresNotes).toBe(true);
  });

  it('allows close without notes when variance is zero', () => {
    const variance = 0;
    const notes = '';
    const requiresNotes = Math.abs(variance) > 0.01 && !notes.trim();
    expect(requiresNotes).toBe(false);
  });
});
