import { describe, expect, it } from 'vitest';
import { countProgress } from '@/lib/engine/setup-schema';

describe('countProgress', () => {
  it('counts only never-answered questions as remaining', () => {
    const cands = [{ lastSeenAt: null }, { lastSeenAt: 100 }, { lastSeenAt: null }];
    expect(countProgress(cands)).toEqual({ total: 3, remaining: 2 });
  });

  it('treats an answer at time 0 as attended', () => {
    expect(countProgress([{ lastSeenAt: 0 }])).toEqual({ total: 1, remaining: 0 });
  });

  it('handles an empty pool', () => {
    expect(countProgress([])).toEqual({ total: 0, remaining: 0 });
  });
});
