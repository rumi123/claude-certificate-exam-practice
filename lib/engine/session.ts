import { shuffle, type Rng } from '@/lib/rng';
import type { Candidate } from './selection';

export type PlanItem = { questionId: string; position: number; optionOrder: string[] };

export function planSession(
  selected: Candidate[],
  optionKeysById: Record<string, string[]>,
  rng: Rng,
): PlanItem[] {
  return selected.map((c, position) => ({
    questionId: c.id,
    position,
    optionOrder: shuffle(optionKeysById[c.id] ?? [], rng),
  }));
}

export function displayLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function timeLimitFor(size: number, timer: boolean): number | null {
  return timer ? size * 120 : null;
}
