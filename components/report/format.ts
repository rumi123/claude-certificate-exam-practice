import type { Status } from '@/lib/analytics/types';
import type { Tone } from '@/components/ui';

export const STATUS_LABEL: Record<Status, string> = {
  strong: 'Strong',
  ok: 'OK',
  weak: 'Weak',
  untested: 'Untested',
};

export const STATUS_TONE: Record<Status, Tone> = {
  strong: 'good',
  ok: 'close',
  weak: 'weak',
  untested: 'neutral',
};

export function pct(x: number | null): string {
  return x === null ? '-' : `${Math.round(x * 100)}%`;
}

// Local calendar date, so an answer given this evening isn't shown as tomorrow or yesterday.
export function dateOf(ms: number | null): string {
  if (ms === null) return '-';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const EMPTY_TASKS = 'Answer 3+ questions on a task to see it here';
export const EMPTY_DATA = 'No answers yet';
export const EMPTY_TRAPS = 'No trap picked yet';
