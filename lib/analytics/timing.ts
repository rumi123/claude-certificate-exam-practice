import type { AnsweredItem } from './types';

export type TimingStats = { n: number; meanS: number | null; medianS: number | null };
export type Timing = {
  overall: TimingStats;
  byDomain: Record<string, TimingStats>;
  slowDomains: string[];
};

const SLOW_MEDIAN_S = 150;

function stats(seconds: number[]): TimingStats {
  if (seconds.length === 0) return { n: 0, meanS: null, medianS: null };
  const sorted = [...seconds].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const medianS = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { n: sorted.length, meanS: sorted.reduce((s, x) => s + x, 0) / sorted.length, medianS };
}

export function timing(items: AnsweredItem[]): Timing {
  const all: number[] = [];
  const perDomain = new Map<string, number[]>();
  for (const item of items) {
    if (item.timeMs === null) continue;
    const s = item.timeMs / 1000;
    all.push(s);
    perDomain.set(item.domainId, [...(perDomain.get(item.domainId) ?? []), s]);
  }
  const byDomain: Record<string, TimingStats> = {};
  for (const [id, list] of perDomain) byDomain[id] = stats(list);
  const slowDomains = Object.keys(byDomain)
    .filter((id) => (byDomain[id].medianS ?? 0) > SLOW_MEDIAN_S)
    .sort();
  return { overall: stats(all), byDomain, slowDomains };
}
