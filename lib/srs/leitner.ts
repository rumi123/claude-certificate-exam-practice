import { DAY_MS } from '@/lib/clock';
import type { Confidence, ReviewEffect } from '@/lib/types';

export const BOX_DAYS = [1, 3, 7, 14, 30];

export type Box = 1 | 2 | 3 | 4 | 5;
export type ReviewState = { box: Box; dueAt: number; lapses: number; retiredAt: number | null };

export function nextReviewState(
  current: ReviewState | null,
  isCorrect: boolean,
  confidence: Confidence | null,
  now: number,
): { state: ReviewState | null; effect: ReviewEffect } {
  const guess = confidence === 'guess';
  const day1 = now + BOX_DAYS[0] * DAY_MS;

  if (!current || current.retiredAt !== null) {
    if (!isCorrect) {
      const lapses = current ? current.lapses + 1 : 0;
      return { state: { box: 1, dueAt: day1, lapses, retiredAt: null }, effect: 'entered' };
    }
    if (guess) {
      const lapses = current ? current.lapses : 0;
      return { state: { box: 1, dueAt: day1, lapses, retiredAt: null }, effect: 'entered' };
    }
    return { state: current, effect: 'none' };
  }

  if (!isCorrect) {
    return {
      state: { box: 1, dueAt: day1, lapses: current.lapses + 1, retiredAt: null },
      effect: 'reset',
    };
  }
  if (guess) {
    const dueAt = now + BOX_DAYS[current.box - 1] * DAY_MS;
    return { state: { ...current, dueAt }, effect: 'stay' };
  }
  if (current.box < 5) {
    const box = (current.box + 1) as Box;
    return { state: { ...current, box, dueAt: now + BOX_DAYS[box - 1] * DAY_MS }, effect: 'up' };
  }
  return { state: { ...current, retiredAt: now }, effect: 'retired' };
}

export function isDue(state: ReviewState, now: number): boolean {
  return state.retiredAt === null && state.dueAt <= now;
}

export type CardRating = 'again' | 'good' | 'easy';

export function nextCardState(
  current: { box: number } | null,
  rating: CardRating,
  now: number,
): { box: Box; dueAt: number } {
  const from = current?.box ?? 0;
  const raw = rating === 'again' ? 1 : rating === 'good' ? from + 1 : from + 2;
  const box = Math.min(raw, 5) as Box;
  return { box, dueAt: now + BOX_DAYS[box - 1] * DAY_MS };
}
