import type { AnsweredItem } from './types';

export type TrapRow = {
  trapId: string;
  exposed: number;
  picked: number;
  rate: number;
  wrongExampleQuestionId: string | null;
};

const MIN_EXPOSED = 3;

export function trapProfile(items: AnsweredItem[]): TrapRow[] {
  const stats = new Map<
    string,
    { exposed: number; picked: number; example: AnsweredItem | null }
  >();
  for (const item of items) {
    const exposed = new Set<string>();
    const picked = new Set<string>();
    for (const o of item.optionTraps) {
      if (!o.trapId) continue;
      exposed.add(o.trapId);
      if (item.selectedKeys.includes(o.key)) picked.add(o.trapId);
    }
    for (const id of exposed) {
      const s = stats.get(id) ?? { exposed: 0, picked: 0, example: null };
      s.exposed++;
      if (picked.has(id)) {
        s.picked++;
        if (!item.isCorrect && (!s.example || item.answeredAt > s.example.answeredAt)) {
          s.example = item;
        }
      }
      stats.set(id, s);
    }
  }
  return [...stats.entries()]
    .filter(([, s]) => s.exposed >= MIN_EXPOSED)
    .map(([trapId, s]) => ({
      trapId,
      exposed: s.exposed,
      picked: s.picked,
      rate: s.picked / s.exposed,
      wrongExampleQuestionId: s.example?.questionId ?? null,
    }))
    .sort((a, b) => b.rate - a.rate || b.picked - a.picked || a.trapId.localeCompare(b.trapId));
}
