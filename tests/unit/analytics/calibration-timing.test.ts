import { describe, expect, it } from 'vitest';
import { calibration } from '@/lib/analytics/calibration';
import { timing } from '@/lib/analytics/timing';
import { item } from '../../fixtures/history';

describe('calibration', () => {
  it('buckets confidence against correctness', () => {
    const items = [
      item({ confidence: 'sure', isCorrect: false, primaryTaskId: '1.1' }),
      item({ confidence: 'sure', isCorrect: false, primaryTaskId: '1.1' }),
      item({ confidence: 'guess', isCorrect: true }),
      item({ confidence: 'sure', isCorrect: true }),
      item({ confidence: 'sure', isCorrect: true }),
      item({ confidence: 'sure', isCorrect: true }),
      item({ confidence: null, isCorrect: false }),
    ];
    const c = calibration(items);
    expect(c.blindSpots).toHaveLength(2);
    expect(c.luckyGuesses).toBe(1);
    expect(c.score).toBeCloseTo(0.6);
    expect(c.blindByTask).toEqual({ '1.1': 2 });
  });

  it('has a null score with no Sure answers', () => {
    expect(calibration([item({ confidence: 'guess' })]).score).toBeNull();
  });
});

describe('timing', () => {
  it('computes mean and median overall and per domain', () => {
    const t = timing([
      item({ domainId: 'D1', timeMs: 10_000 }),
      item({ domainId: 'D1', timeMs: 20_000 }),
      item({ domainId: 'D2', timeMs: 30_000 }),
      item({ domainId: 'D2', timeMs: 100_000 }),
    ]);
    expect(t.overall).toMatchObject({ n: 4, meanS: 40, medianS: 25 });
    expect(t.byDomain.D1).toMatchObject({ meanS: 15, medianS: 15 });
    expect(t.byDomain.D2.medianS).toBe(65);
    expect(t.slowDomains).toEqual([]);
  });

  it('flags a domain with median over 150 s', () => {
    expect(timing([item({ domainId: 'D3', timeMs: 151_000 })]).slowDomains).toEqual(['D3']);
    expect(timing([item({ domainId: 'D3', timeMs: 150_000 })]).slowDomains).toEqual([]);
  });
});
