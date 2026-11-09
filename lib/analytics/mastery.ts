import type { AnsweredItem, Status, TaskMastery } from './types';

const WINDOW = 10;
const DECAY = 0.85;
const MIN_ANSWERS = 3;

export function statusFor(mastery: number | null, n: number): Status {
  if (mastery === null || n < MIN_ANSWERS) return 'untested';
  if (mastery >= 0.8) return 'strong';
  if (mastery >= 0.65) return 'ok';
  return 'weak';
}

export function taskMastery(items: AnsweredItem[], taskId: string): TaskMastery {
  const used = items
    .filter((i) => i.primaryTaskId === taskId || i.secondaryTaskIds.includes(taskId))
    .sort((a, b) => b.answeredAt - a.answeredAt)
    .slice(0, WINDOW);
  if (used.length === 0) return { mastery: null, n: 0, status: 'untested' };
  let num = 0;
  let den = 0;
  used.forEach((item, idx) => {
    const w = DECAY ** idx * (item.primaryTaskId === taskId ? 1 : 0.5);
    num += w * (item.isCorrect ? 1 : 0);
    den += w;
  });
  const mastery = num / den;
  return { mastery, n: used.length, status: statusFor(mastery, used.length) };
}

// Average of the non-untested task masteries, weighted by bank question count.
export function domainMastery(
  taskResults: Record<string, TaskMastery>,
  bankCountsByTask: Record<string, number>,
  tasksOfDomain: string[],
): number | null {
  const scored = tasksOfDomain.filter((id) => {
    const r = taskResults[id];
    return r && r.status !== 'untested' && r.mastery !== null;
  });
  if (scored.length === 0) return null;
  const total = scored.reduce((s, id) => s + (bankCountsByTask[id] ?? 0), 0);
  let num = 0;
  for (const id of scored) {
    const w = total > 0 ? (bankCountsByTask[id] ?? 0) : 1;
    num += w * taskResults[id].mastery!;
  }
  return num / (total > 0 ? total : scored.length);
}
