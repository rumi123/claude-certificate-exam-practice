import { describe, expect, it } from 'vitest';
import { confidenceLabel, scaledScore, weightedRaw } from '@/lib/analytics/readiness';

describe('scaledScore', () => {
  it('maps the anchors', () => {
    expect(scaledScore(0.72, 0.72)).toBe(720);
    expect(scaledScore(1, 0.72)).toBe(1000);
    expect(scaledScore(0, 0.72)).toBe(100);
    expect(scaledScore(0.5, 0.72)).toBe(530);
  });
});

describe('weightedRaw', () => {
  const w = { D1: 0.27, D2: 0.18, D3: 0.2, D4: 0.2, D5: 0.15 };
  it('treats untested domains as 0', () => {
    const raw = weightedRaw({ D1: null, D2: null, D3: null, D4: null, D5: null }, w);
    expect(raw).toBe(0);
    expect(scaledScore(raw)).toBe(100);
  });
  it('a weak tested domain never scores below untested', () => {
    const untested = weightedRaw({ D1: null, D2: null, D3: null, D4: null, D5: null }, w);
    const weak = weightedRaw({ D1: 0.2, D2: null, D3: null, D4: null, D5: null }, w);
    expect(weak).toBeGreaterThan(untested);
  });
});

describe('confidenceLabel', () => {
  const all = (n: number) => ({ D1: n, D2: n, D3: n, D4: n, D5: n });
  it('follows the thresholds', () => {
    expect(confidenceLabel(59, all(15))).toBe('Low data');
    expect(confidenceLabel(60, all(15))).toBe('Medium');
    expect(confidenceLabel(150, { ...all(20), D3: 14 })).toBe('Medium');
    expect(confidenceLabel(150, all(15))).toBe('Good');
  });
});
