import { describe, expect, it } from 'vitest';
import { seededRng, shuffle } from '@/lib/rng';

describe('seededRng', () => {
  it('gives the same first 5 numbers for the same seed', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    const first = Array.from({ length: 5 }, () => a());
    const second = Array.from({ length: 5 }, () => b());
    expect(first).toEqual(second);
    for (const n of first) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('keeps all elements and does not mutate the input', () => {
    const copy = [...input];
    const out = shuffle(input, seededRng(7));
    expect(input).toEqual(copy);
    expect([...out].sort((x, y) => x - y)).toEqual(copy);
    expect(out).not.toBe(input);
  });

  it('gives the same order for the same seed', () => {
    expect(shuffle(input, seededRng(3))).toEqual(shuffle(input, seededRng(3)));
  });
});
