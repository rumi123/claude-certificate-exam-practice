import { describe, expect, it } from 'vitest';
import { domainMastery, statusFor, taskMastery } from '@/lib/analytics/mastery';
import { history, item } from '../../fixtures/history';

describe('taskMastery', () => {
  it('weights newest-first answers by 0.85^i', () => {
    const r = taskMastery(history('1.1', [1, 0, 1]), '1.1');
    expect(r.mastery).toBeCloseTo(0.6696, 4);
    expect(r.n).toBe(3);
    expect(r.status).toBe('ok');
  });

  it('is untested under 3 answers but still returns mastery', () => {
    const r = taskMastery(history('1.1', [1, 1]), '1.1');
    expect(r).toMatchObject({ mastery: 1, n: 2, status: 'untested' });
  });

  it('halves the weight of secondary tags', () => {
    const items = [
      item({ primaryTaskId: '9.9', secondaryTaskIds: ['1.1'], isCorrect: true, answeredAt: 1000 }),
      ...history('1.1', [0, 0]).map((i, idx) => ({ ...i, answeredAt: 999 - idx })),
    ];
    expect(taskMastery(items, '1.1').mastery).toBeCloseTo(0.5 / (0.5 + 0.85 + 0.7225), 4);
  });

  it('uses only the newest 10 answers', () => {
    const r = taskMastery(history('1.1', [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0]), '1.1');
    expect(r.n).toBe(10);
    expect(r.mastery).toBe(1);
  });

  it('returns null mastery with no answers', () => {
    expect(taskMastery([], '1.1')).toEqual({ mastery: null, n: 0, status: 'untested' });
  });
});

describe('statusFor', () => {
  it('applies the bands', () => {
    expect(statusFor(0.8, 5)).toBe('strong');
    expect(statusFor(0.65, 5)).toBe('ok');
    expect(statusFor(0.64, 5)).toBe('weak');
    expect(statusFor(0.9, 2)).toBe('untested');
  });
});

describe('domainMastery', () => {
  const r = (mastery: number, n = 5) => ({ mastery, n, status: statusFor(mastery, n) });
  it('weights by bank count and skips untested tasks', () => {
    const results = { a: r(1), b: r(0), c: r(0.2, 1) };
    expect(domainMastery(results, { a: 3, b: 1, c: 10 }, ['a', 'b', 'c'])).toBeCloseTo(0.75);
  });
  it('is null when every task is untested', () => {
    expect(domainMastery({ a: r(1, 1) }, { a: 1 }, ['a'])).toBeNull();
  });
});
