import type { Status } from '@/lib/analytics/types';
import type { Prefer } from '@/lib/types';
import type { Candidate } from './selection';

export type Preset = 'd1' | 'd3' | 'weak' | 'traps' | 'blind';

export const PRESETS: readonly Preset[] = ['d1', 'd3', 'weak', 'traps', 'blind'];

export const PRESET_NAMES: Record<Preset, string> = {
  d1: 'D1 Deep Drill',
  d3: 'D3 Deep Drill',
  weak: 'Weak Areas',
  traps: 'Trap Buster',
  blind: 'Blind Spots',
};

export type PresetContext = {
  mastery: Record<string, number | null>;
  taskStatus: Record<string, Status>;
  domainWeight: Record<string, number>;
  topTraps: string[];
  trapsByQuestion: Record<string, string[]>;
  blindSpotQuestionIds: { id: string; at: number }[];
};

export type PresetSelection = {
  cands: Candidate[];
  rankKey?: (c: Candidate) => number;
  prefer?: Prefer;
  available: boolean;
  reason?: string;
};

export function isPreset(v: unknown): v is Preset {
  return PRESETS.some((p) => p === v);
}

function unavailable(reason: string): PresetSelection {
  return { cands: [], available: false, reason };
}

function weakAreas(cands: Candidate[], ctx: PresetContext): PresetSelection {
  const weak = cands.filter((c) => {
    const status = ctx.taskStatus[c.primaryTaskId] ?? 'untested';
    return status === 'weak' || status === 'untested';
  });
  const gap = (c: Candidate) =>
    (1 - (ctx.mastery[c.primaryTaskId] ?? 0.5)) * (ctx.domainWeight[c.domainId] ?? 0);
  return { cands: weak, rankKey: (c) => -gap(c), available: weak.length > 0 };
}

function trapBuster(cands: Candidate[], ctx: PresetContext): PresetSelection {
  if (ctx.topTraps.length < 3) return unavailable('Answer more questions to find your top traps');
  const top = new Set(ctx.topTraps.slice(0, 3));
  const hit = cands.filter((c) => (ctx.trapsByQuestion[c.id] ?? []).some((t) => top.has(t)));
  return { cands: hit, prefer: 'weakest', available: hit.length > 0 };
}

function blindSpots(cands: Candidate[], ctx: PresetContext): PresetSelection {
  const latest = new Map<string, number>();
  for (const b of ctx.blindSpotQuestionIds) {
    latest.set(b.id, Math.max(latest.get(b.id) ?? Number.NEGATIVE_INFINITY, b.at));
  }
  const hit = cands.filter((c) => latest.has(c.id));
  if (hit.length === 0) return unavailable('No blind spots yet');
  return { cands: hit, rankKey: (c) => -(latest.get(c.id) ?? 0), available: true };
}

export function presetSelection(
  preset: Preset,
  cands: Candidate[],
  ctx: PresetContext,
): PresetSelection {
  switch (preset) {
    case 'd1':
    case 'd3': {
      const domainId = preset.toUpperCase();
      const own = cands.filter((c) => c.domainId === domainId);
      return { cands: own, prefer: 'weakest', available: own.length > 0 };
    }
    case 'weak':
      return weakAreas(cands, ctx);
    case 'traps':
      return trapBuster(cands, ctx);
    case 'blind':
      return blindSpots(cands, ctx);
  }
}
