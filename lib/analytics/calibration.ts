import type { AnsweredItem } from './types';

export type Calibration = {
  blindSpots: AnsweredItem[];
  luckyGuesses: number;
  unsure: number;
  sureTotal: number;
  sureCorrect: number;
  score: number | null;
  blindByTask: Record<string, number>;
};

export function calibration(items: AnsweredItem[]): Calibration {
  const out: Calibration = {
    blindSpots: [],
    luckyGuesses: 0,
    unsure: 0,
    sureTotal: 0,
    sureCorrect: 0,
    score: null,
    blindByTask: {},
  };
  for (const item of items) {
    if (!item.confidence) continue;
    if (item.confidence === 'sure') {
      out.sureTotal++;
      if (item.isCorrect) out.sureCorrect++;
      else {
        out.blindSpots.push(item);
        out.blindByTask[item.primaryTaskId] = (out.blindByTask[item.primaryTaskId] ?? 0) + 1;
      }
    } else if (item.confidence === 'guess') {
      if (item.isCorrect) out.luckyGuesses++;
    } else {
      out.unsure++;
    }
  }
  out.score = out.sureTotal > 0 ? out.sureCorrect / out.sureTotal : null;
  return out;
}
