import { describe, expect, it } from 'vitest';
import { selectQuestions, type Candidate, type SelectOptions } from '@/lib/engine/selection';
import { seededRng } from '@/lib/rng';

function cand(id: string, over: Partial<Candidate> = {}): Candidate {
  return {
    id,
    scenarioId: 'S1',
    type: 'single',
    primaryTaskId: 't1',
    domainId: 'd1',
    lastSeenAt: null,
    ...over,
  };
}

const base: SelectOptions = { size: 10, prefer: 'random', groupByScenario: false, multi: 'yes' };
const ids = (cs: Candidate[]) => cs.map((c) => c.id);

describe('selectQuestions', () => {
  it('unseen first, then oldest seen first', () => {
    const cands = [
      cand('seen-new', { lastSeenAt: 500 }),
      cand('u1'),
      cand('seen-old', { lastSeenAt: 100 }),
      cand('u2'),
      cand('u3'),
    ];
    const out = ids(selectQuestions(cands, { ...base, prefer: 'unseen' }, seededRng(1)));
    expect(out.slice(0, 3).sort()).toEqual(['u1', 'u2', 'u3']);
    expect(out.slice(3)).toEqual(['seen-old', 'seen-new']);
  });

  it('weakest first with null as 0.5', () => {
    const cands = [
      cand('hi', { primaryTaskId: 'a' }),
      cand('none', { primaryTaskId: 'b' }),
      cand('lo', { primaryTaskId: 'c' }),
    ];
    const mastery = { a: 0.9, b: null, c: 0.2 };
    const out = selectQuestions(cands, { ...base, prefer: 'weakest', mastery }, seededRng(1));
    expect(ids(out)).toEqual(['lo', 'none', 'hi']);
  });

  it('applies the multi filter', () => {
    const cands = [cand('s1'), cand('m1', { type: 'multi' }), cand('s2')];
    expect(ids(selectQuestions(cands, { ...base, multi: 'only' }, seededRng(1)))).toEqual(['m1']);
    expect(ids(selectQuestions(cands, { ...base, multi: 'no' }, seededRng(1))).sort()).toEqual([
      's1',
      's2',
    ]);
    expect(selectQuestions(cands, { ...base, multi: 'yes' }, seededRng(1))).toHaveLength(3);
  });

  it('caps the result at size', () => {
    const cands = Array.from({ length: 8 }, (_, i) => cand(`q${i}`));
    expect(selectQuestions(cands, { ...base, size: 3 }, seededRng(1))).toHaveLength(3);
  });

  it('groups by scenario and keeps ranked order inside', () => {
    const cands = [
      cand('a2', { scenarioId: 'S2', lastSeenAt: 1 }),
      cand('b1', { scenarioId: 'S1', lastSeenAt: 4 }),
      cand('a1', { scenarioId: 'S2', lastSeenAt: 2 }),
      cand('b0', { scenarioId: 'S1', lastSeenAt: 3 }),
    ];
    const out = selectQuestions(
      cands,
      { ...base, prefer: 'unseen', groupByScenario: true },
      seededRng(1),
    );
    expect(ids(out)).toEqual(['b0', 'b1', 'a2', 'a1']);
  });

  it('uses rankKey instead of prefer when given', () => {
    const cands = [cand('a'), cand('b'), cand('c')];
    const rankKey = (c: Candidate) => -c.id.charCodeAt(0);
    const out = selectQuestions(cands, { ...base, prefer: 'unseen', rankKey }, seededRng(1));
    expect(ids(out)).toEqual(['c', 'b', 'a']);
  });

  it('is deterministic for the same seed', () => {
    const cands = Array.from({ length: 10 }, (_, i) => cand(`q${i}`));
    const a = ids(selectQuestions(cands, base, seededRng(7)));
    const b = ids(selectQuestions(cands, base, seededRng(7)));
    expect(a).toEqual(b);
  });
});
