import { describe, expect, it } from 'vitest';
import type { Status } from '@/lib/analytics/types';
import { presetSelection, type PresetContext } from '@/lib/engine/presets';
import { selectQuestions, type Candidate } from '@/lib/engine/selection';
import { seededRng } from '@/lib/rng';

function cand(id: string, over: Partial<Candidate> = {}): Candidate {
  return {
    id,
    scenarioId: 'S1',
    type: 'single',
    primaryTaskId: '1.1',
    domainId: 'D1',
    lastSeenAt: null,
    ...over,
  };
}

function ctx(over: Partial<PresetContext> = {}): PresetContext {
  return {
    mastery: {},
    taskStatus: {},
    domainWeight: { D1: 27, D3: 20, D5: 15 },
    topTraps: [],
    trapsByQuestion: {},
    blindSpotQuestionIds: [],
    ...over,
  };
}

const ids = (cs: Candidate[]) => cs.map((c) => c.id);

describe('presetSelection', () => {
  it('d1 returns only D1-primary candidates and prefers weakest', () => {
    const cands = [cand('a'), cand('b', { domainId: 'D3' }), cand('c')];
    const sel = presetSelection('d1', cands, ctx());
    expect(ids(sel.cands)).toEqual(['a', 'c']);
    expect(sel.prefer).toBe('weakest');
    expect(sel.available).toBe(true);
    expect(ids(presetSelection('d3', cands, ctx()).cands)).toEqual(['b']);
  });

  it('weak excludes strong tasks and ranks a D1 weak task above a D5 weak task', () => {
    const cands = [
      cand('d5', { domainId: 'D5', primaryTaskId: '5.1' }),
      cand('d1', { domainId: 'D1', primaryTaskId: '1.1' }),
      cand('strong', { domainId: 'D1', primaryTaskId: '1.2' }),
      cand('ok', { domainId: 'D1', primaryTaskId: '1.3' }),
    ];
    const taskStatus: Record<string, Status> = {
      '5.1': 'weak',
      '1.1': 'weak',
      '1.2': 'strong',
      '1.3': 'ok',
    };
    const mastery = { '5.1': 0.4, '1.1': 0.4, '1.2': 0.9, '1.3': 0.7 };
    const sel = presetSelection('weak', cands, ctx({ mastery, taskStatus }));
    expect(ids(sel.cands).sort()).toEqual(['d1', 'd5']);
    const out = selectQuestions(
      sel.cands,
      { size: 5, prefer: 'unseen', groupByScenario: false, multi: 'yes', rankKey: sel.rankKey },
      seededRng(1),
    );
    expect(ids(out)).toEqual(['d1', 'd5']);
  });

  it('weak treats a task with no status as untested', () => {
    const sel = presetSelection('weak', [cand('x')], ctx());
    expect(ids(sel.cands)).toEqual(['x']);
  });

  it('traps is unavailable with 2 ranked traps', () => {
    const sel = presetSelection('traps', [cand('a')], ctx({ topTraps: ['T1', 'T2'] }));
    expect(sel.available).toBe(false);
    expect(sel.reason).toBe('Answer more questions to find your top traps');
  });

  it('traps keeps questions with an option in the top 3 traps', () => {
    const sel = presetSelection(
      'traps',
      [cand('a'), cand('b'), cand('c')],
      ctx({
        topTraps: ['T1', 'T2', 'T3'],
        trapsByQuestion: { a: ['T2'], b: ['T9'], c: ['T9', 'T3'] },
      }),
    );
    expect(ids(sel.cands)).toEqual(['a', 'c']);
    expect(sel.prefer).toBe('weakest');
  });

  it('blind is unavailable with none and orders by latest blind spot', () => {
    const none = presetSelection('blind', [cand('a')], ctx());
    expect(none.available).toBe(false);
    expect(none.reason).toBe('No blind spots yet');

    const sel = presetSelection(
      'blind',
      [cand('a'), cand('b'), cand('c')],
      ctx({
        blindSpotQuestionIds: [
          { id: 'a', at: 100 },
          { id: 'b', at: 300 },
          { id: 'a', at: 200 },
        ],
      }),
    );
    expect(ids(sel.cands)).toEqual(['a', 'b']);
    const out = selectQuestions(
      sel.cands,
      { size: 5, prefer: 'unseen', groupByScenario: false, multi: 'yes', rankKey: sel.rankKey },
      seededRng(1),
    );
    expect(ids(out)).toEqual(['b', 'a']);
  });
});
