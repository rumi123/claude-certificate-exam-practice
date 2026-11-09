import type { AnsweredItem } from '@/lib/analytics/types';

let counter = 0;

export function item(over: Partial<AnsweredItem> = {}): AnsweredItem {
  counter++;
  return {
    sessionId: 's1',
    questionId: `Q${counter}`,
    scenarioId: 'S1',
    domainId: 'D1',
    primaryTaskId: '1.1',
    secondaryTaskIds: [],
    selectCount: 1,
    isCorrect: true,
    correctSelected: 1,
    confidence: 'sure',
    timeMs: 60_000,
    answeredAt: counter,
    selectedKeys: ['a'],
    optionTraps: [],
    ...over,
  };
}

// Items for one task, newest first in `results` order (1 = correct).
export function history(taskId: string, results: number[], over: Partial<AnsweredItem> = {}) {
  const base = 1000;
  return results.map((r, idx) =>
    item({
      primaryTaskId: taskId,
      isCorrect: r === 1,
      answeredAt: base - idx,
      ...over,
    }),
  );
}
