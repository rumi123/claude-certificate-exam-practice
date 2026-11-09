import type { Status, TaskMastery } from './types';

export type PriorityEntry = {
  taskId: string;
  title: string;
  domainId: string;
  status: Status;
  mastery: number | null;
  n: number;
  priority: number;
  reasons: string[];
};

export const PRIORITY_TOP = 8;

export function studyPriority(
  tasks: { id: string; title: string; domainId: string }[],
  taskResults: Record<string, TaskMastery>,
  domainWeights: Record<string, number>,
  blindByTask: Record<string, number>,
  answersByTask: Record<string, number>,
  topTrapByTask: Record<string, string>,
  top: number = PRIORITY_TOP,
): PriorityEntry[] {
  const entries: PriorityEntry[] = [];
  for (const task of tasks) {
    const r = taskResults[task.id] ?? { mastery: null, n: 0, status: 'untested' as Status };
    if (r.status === 'strong') continue;
    const weight = domainWeights[task.domainId] ?? 0;
    const gap = r.status === 'untested' || r.mastery === null ? 0.5 : 1 - r.mastery;
    const answers = answersByTask[task.id] ?? 0;
    const blind = blindByTask[task.id] ?? 0;
    const boost = 1 + (answers > 0 ? 0.5 * (blind / answers) : 0);
    const reasons: string[] = [];
    if (r.mastery !== null && r.n > 0) {
      reasons.push(`Accuracy ${Math.round(r.mastery * 100)}% over last ${r.n} answers`);
    }
    if (blind > 0) reasons.push(`${blind} blind ${blind === 1 ? 'spot' : 'spots'}`);
    if (topTrapByTask[task.id]) reasons.push(`Most-picked trap here: ${topTrapByTask[task.id]}`);
    entries.push({
      taskId: task.id,
      title: task.title,
      domainId: task.domainId,
      status: r.status,
      mastery: r.mastery,
      n: r.n,
      priority: gap * weight * boost * 100,
      reasons,
    });
  }
  const weightOf = (e: PriorityEntry) => domainWeights[e.domainId] ?? 0;
  entries.sort(
    (a, b) =>
      b.priority - a.priority || weightOf(b) - weightOf(a) || a.taskId.localeCompare(b.taskId),
  );
  return entries.slice(0, top);
}
