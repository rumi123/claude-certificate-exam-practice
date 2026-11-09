import { describe, expect, it } from 'vitest';
import { DAY_MS } from '@/lib/clock';
import { isDue, nextCardState, nextReviewState, type ReviewState } from '@/lib/srs/leitner';

const T = 1_000_000_000_000;
const st = (over: Partial<ReviewState> = {}): ReviewState => ({
  box: 1,
  dueAt: T,
  lapses: 0,
  retiredAt: null,
  ...over,
});

describe('nextReviewState, not in queue', () => {
  it('wrong enters box 1', () => {
    const r = nextReviewState(null, false, 'sure', T);
    expect(r.state).toEqual({ box: 1, dueAt: T + DAY_MS, lapses: 0, retiredAt: null });
    expect(r.effect).toBe('entered');
  });
  it('correct guess enters box 1', () => {
    const r = nextReviewState(null, true, 'guess', T);
    expect(r.state?.box).toBe(1);
    expect(r.state?.dueAt).toBe(T + DAY_MS);
    expect(r.effect).toBe('entered');
  });
  it('correct sure/unsure changes nothing', () => {
    for (const conf of ['sure', 'unsure'] as const) {
      const r = nextReviewState(null, true, conf, T);
      expect(r.state).toBeNull();
      expect(r.effect).toBe('none');
    }
  });
  it('retired then wrong re-enters with lapses + 1', () => {
    const r = nextReviewState(st({ box: 5, lapses: 1, retiredAt: T - 1 }), false, 'sure', T);
    expect(r.state).toEqual({ box: 1, dueAt: T + DAY_MS, lapses: 2, retiredAt: null });
    expect(r.effect).toBe('entered');
  });
  it('retired correct sure leaves state unchanged', () => {
    const cur = st({ box: 5, retiredAt: T - 1 });
    const r = nextReviewState(cur, true, 'sure', T);
    expect(r.state).toEqual(cur);
    expect(r.effect).toBe('none');
  });
  it('null confidence follows the wrong rule', () => {
    expect(nextReviewState(null, false, null, T).effect).toBe('entered');
  });
});

describe('nextReviewState, in queue', () => {
  it('wrong resets to box 1 with lapses + 1', () => {
    const r = nextReviewState(st({ box: 4, lapses: 2 }), false, 'unsure', T);
    expect(r.state).toEqual({ box: 1, dueAt: T + DAY_MS, lapses: 3, retiredAt: null });
    expect(r.effect).toBe('reset');
  });
  it('correct guess stays in box', () => {
    const r = nextReviewState(st({ box: 3 }), true, 'guess', T);
    expect(r.state?.box).toBe(3);
    expect(r.state?.dueAt).toBe(T + 7 * DAY_MS);
    expect(r.effect).toBe('stay');
  });
  it('correct sure moves up a box', () => {
    const r = nextReviewState(st({ box: 2 }), true, 'sure', T);
    expect(r.state?.box).toBe(3);
    expect(r.state?.dueAt).toBe(T + 7 * DAY_MS);
    expect(r.effect).toBe('up');
  });
  it('box 5 correct sure retires', () => {
    const r = nextReviewState(st({ box: 5 }), true, 'sure', T);
    expect(r.state?.retiredAt).toBe(T);
    expect(r.effect).toBe('retired');
  });
  it('null confidence follows the wrong rule', () => {
    expect(nextReviewState(st({ box: 3 }), false, null, T).effect).toBe('reset');
  });
});

describe('isDue', () => {
  it('is false before dueAt and true at dueAt', () => {
    const s = st({ dueAt: T });
    expect(isDue(s, T - 1)).toBe(false);
    expect(isDue(s, T)).toBe(true);
  });
  it('is false when retired', () => {
    expect(isDue(st({ retiredAt: T - 5 }), T)).toBe(false);
  });
});

describe('nextCardState', () => {
  it('from unseen: again 1, good 1, easy 2', () => {
    expect(nextCardState(null, 'again', T).box).toBe(1);
    expect(nextCardState(null, 'good', T).box).toBe(1);
    expect(nextCardState(null, 'easy', T).box).toBe(2);
  });
  it('caps at box 5 and sets due date', () => {
    const r = nextCardState({ box: 4 }, 'easy', T);
    expect(r.box).toBe(5);
    expect(r.dueAt).toBe(T + 30 * DAY_MS);
  });
  it('again resets to box 1', () => {
    expect(nextCardState({ box: 4 }, 'again', T).box).toBe(1);
  });
});
