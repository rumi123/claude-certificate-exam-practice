import { describe, expect, it } from 'vitest';
import { displayLetter, planSession, timeLimitFor } from '@/lib/engine/session';
import type { Candidate } from '@/lib/engine/selection';
import { seededRng } from '@/lib/rng';

const c = (id: string): Candidate => ({
  id,
  scenarioId: 'S1',
  type: 'single',
  primaryTaskId: 't1',
  domainId: 'd1',
  lastSeenAt: null,
});

describe('planSession', () => {
  const keys = {
    q1: ['a', 'b', 'c', 'd'],
    q2: ['a', 'b', 'c', 'd', 'e'],
    q3: ['a', 'b', 'c', 'd'],
  };
  const plan = planSession([c('q1'), c('q2'), c('q3')], keys, seededRng(1));

  it('numbers positions from 0', () => {
    expect(plan.map((p) => p.position)).toEqual([0, 1, 2]);
    expect(plan.map((p) => p.questionId)).toEqual(['q1', 'q2', 'q3']);
  });
  it('option order is a permutation of the keys', () => {
    for (const p of plan) {
      expect([...p.optionOrder].sort()).toEqual([...keys[p.questionId as keyof typeof keys]]);
    }
  });
  it('does not mutate the input keys', () => {
    expect(keys.q1).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('displayLetter', () => {
  it('maps 0-4 to A-E', () => {
    expect([0, 1, 2, 3, 4].map(displayLetter)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
});

describe('timeLimitFor', () => {
  it('is size x 120 with timer, null without', () => {
    expect(timeLimitFor(25, true)).toBe(3000);
    expect(timeLimitFor(25, false)).toBeNull();
  });
});
