import type { MultiFilter, Prefer } from '@/lib/types';
import { shuffle, type Rng } from '@/lib/rng';

export type Candidate = {
  id: string;
  scenarioId: string;
  type: 'single' | 'multi';
  primaryTaskId: string;
  domainId: string;
  lastSeenAt: number | null;
};

export type SelectOptions = {
  size: number;
  prefer: Prefer;
  groupByScenario: boolean;
  multi: MultiFilter;
  mastery?: Record<string, number | null>;
  rankKey?: (c: Candidate) => number;
};

function filterMulti(cands: Candidate[], multi: MultiFilter): Candidate[] {
  if (multi === 'only') return cands.filter((c) => c.type === 'multi');
  if (multi === 'no') return cands.filter((c) => c.type === 'single');
  return cands;
}

function preferKey(c: Candidate, opts: SelectOptions): number {
  if (opts.prefer === 'weakest') return opts.mastery?.[c.primaryTaskId] ?? 0.5;
  // unseen: never-seen first, then longest ago first
  return c.lastSeenAt ?? Number.NEGATIVE_INFINITY;
}

function rank(cands: Candidate[], opts: SelectOptions, rng: Rng): Candidate[] {
  const shuffled = shuffle(cands, rng);
  if (!opts.rankKey && opts.prefer === 'random') return shuffled;
  const key = opts.rankKey ?? ((c: Candidate) => preferKey(c, opts));
  const keyed = shuffled.map((c) => ({ c, k: key(c) }));
  // Array.prototype.sort is stable, so the shuffle breaks ties.
  keyed.sort((a, b) => (a.k === b.k ? 0 : a.k < b.k ? -1 : 1));
  return keyed.map((x) => x.c);
}

function groupByScenario(ranked: Candidate[]): Candidate[] {
  const ids = [...new Set(ranked.map((c) => c.scenarioId))].sort();
  return ids.flatMap((id) => ranked.filter((c) => c.scenarioId === id));
}

export function selectQuestions(cands: Candidate[], opts: SelectOptions, rng: Rng): Candidate[] {
  const ranked = rank(filterMulti(cands, opts.multi), opts, rng);
  const taken = ranked.slice(0, Math.max(0, opts.size));
  return opts.groupByScenario ? groupByScenario(taken) : taken;
}
