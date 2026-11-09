import { calibration, type Calibration } from '@/lib/analytics/calibration';
import { domainMastery, taskMastery } from '@/lib/analytics/mastery';
import { PRIORITY_TOP, studyPriority, type PriorityEntry } from '@/lib/analytics/priority';
import {
  confidenceLabel,
  scaledScore,
  weightedRaw,
  type ConfidenceLabel,
} from '@/lib/analytics/readiness';
import { timing, type Timing } from '@/lib/analytics/timing';
import { trapProfile, type TrapRow } from '@/lib/analytics/traps';
import type { AnsweredItem, Status, TaskMastery } from '@/lib/analytics/types';

export type ReportInput = {
  items: AnsweredItem[];
  sessions: { id: string; finishedAt: number | null; correct: number; answered: number }[];
  tasks: { id: string; title: string; domainId: string }[];
  domains: { id: string; name: string; weight: number }[];
  scenarios: { id: string; name: string }[];
  traps: { id: string; name: string; description: string; principle: string }[];
  bankCountsByTask: Record<string, number>;
  dueCount: number;
  now: number;
};

export type TaskRow = {
  id: string;
  title: string;
  domainId: string;
  status: Status;
  mastery: number | null;
  n: number;
  lastSeenAt: number | null;
};

export type DomainRow = {
  id: string;
  name: string;
  weight: number;
  mastery: number | null;
  status: Status;
  answers: number;
  tasks: TaskRow[];
};

export type ReportTrap = TrapRow & { name: string; description: string; principle: string };

export type Report = {
  summary: {
    score: number;
    label: ConfidenceLabel;
    totalAnswers: number;
    accuracy: number | null;
    calibrationScore: number | null;
    dueCount: number;
    trend: number[];
  };
  priorities: PriorityEntry[];
  // Dashboard "Study again": the top 3 tested tasks, which untested ones can push out of `priorities`.
  studyAgain: PriorityEntry[];
  domains: DomainRow[];
  tasks: TaskRow[];
  traps: ReportTrap[];
  calibration: Calibration;
  timing: Timing;
  scenarios: { id: string; name: string; answered: number; accuracy: number | null }[];
};

function countBy<T>(list: T[], key: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of list) out[key(x)] = (out[key(x)] ?? 0) + 1;
  return out;
}

// Name of the trap picked most often on each task (primary tag only).
function topTrapNames(items: AnsweredItem[], names: Map<string, string>): Record<string, string> {
  const picks = new Map<string, Map<string, number>>();
  for (const item of items) {
    const seen = new Set<string>();
    for (const o of item.optionTraps) {
      if (o.trapId && item.selectedKeys.includes(o.key)) seen.add(o.trapId);
    }
    for (const trapId of seen) {
      const m = picks.get(item.primaryTaskId) ?? new Map<string, number>();
      m.set(trapId, (m.get(trapId) ?? 0) + 1);
      picks.set(item.primaryTaskId, m);
    }
  }
  const out: Record<string, string> = {};
  for (const [taskId, m] of picks) {
    const best = [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    out[taskId] = names.get(best[0]) ?? best[0];
  }
  return out;
}

export function buildReport(input: ReportInput): Report {
  const { items, tasks, domains } = input;
  const results: Record<string, TaskMastery> = {};
  const lastSeen: Record<string, number> = {};
  const answersByTask = countBy(items, (i) => i.primaryTaskId);
  for (const task of tasks) {
    results[task.id] = taskMastery(items, task.id);
    for (const i of items) {
      if (i.primaryTaskId === task.id || i.secondaryTaskIds.includes(task.id)) {
        lastSeen[task.id] = Math.max(lastSeen[task.id] ?? 0, i.answeredAt);
      }
    }
  }
  const taskRow = (t: (typeof tasks)[number]): TaskRow => ({
    id: t.id,
    title: t.title,
    domainId: t.domainId,
    status: results[t.id].status,
    mastery: results[t.id].mastery,
    n: results[t.id].n,
    lastSeenAt: lastSeen[t.id] ?? null,
  });

  const answersPerDomain = Object.fromEntries(domains.map((d) => [d.id, 0]));
  for (const i of items) answersPerDomain[i.domainId] = (answersPerDomain[i.domainId] ?? 0) + 1;

  const domainMasteries: Record<string, number | null> = {};
  const domainRows: DomainRow[] = domains.map((d) => {
    const ids = tasks.filter((t) => t.domainId === d.id).map((t) => t.id);
    const mastery = domainMastery(results, input.bankCountsByTask, ids);
    domainMasteries[d.id] = mastery;
    return {
      id: d.id,
      name: d.name,
      weight: d.weight,
      mastery,
      status: mastery === null ? 'untested' : statusOf(mastery),
      answers: answersPerDomain[d.id],
      tasks: tasks.filter((t) => t.domainId === d.id).map(taskRow),
    };
  });

  const weights = Object.fromEntries(domains.map((d) => [d.id, d.weight]));
  const cal = calibration(items);
  const trapNames = new Map(input.traps.map((t) => [t.id, t.name]));
  const trapInfo = new Map(input.traps.map((t) => [t.id, t]));
  const correct = items.filter((i) => i.isCorrect).length;

  const trend = input.sessions
    .filter((s) => s.finishedAt !== null && s.answered > 0)
    .sort((a, b) => a.finishedAt! - b.finishedAt!)
    .slice(-5)
    .map((s) => s.correct / s.answered);

  const allPriorities = studyPriority(
    tasks,
    results,
    weights,
    cal.blindByTask,
    answersByTask,
    topTrapNames(items, trapNames),
    Infinity,
  );

  return {
    summary: {
      score: scaledScore(weightedRaw(domainMasteries, weights)),
      label: confidenceLabel(items.length, answersPerDomain),
      totalAnswers: items.length,
      accuracy: items.length > 0 ? correct / items.length : null,
      calibrationScore: cal.score,
      dueCount: input.dueCount,
      trend,
    },
    priorities: allPriorities.slice(0, PRIORITY_TOP),
    studyAgain: allPriorities.filter((p) => p.status !== 'untested').slice(0, 3),
    domains: domainRows,
    tasks: tasks.map(taskRow),
    traps: trapProfile(items)
      .slice(0, 5)
      .map((row) => {
        const info = trapInfo.get(row.trapId);
        return {
          ...row,
          name: info?.name ?? row.trapId,
          description: info?.description ?? '',
          principle: info?.principle ?? '',
        };
      }),
    calibration: cal,
    timing: timing(items),
    scenarios: input.scenarios.map((s) => {
      const list = items.filter((i) => i.scenarioId === s.id);
      const ok = list.filter((i) => i.isCorrect).length;
      return {
        id: s.id,
        name: s.name,
        answered: list.length,
        accuracy: list.length > 0 ? ok / list.length : null,
      };
    }),
  };
}

function statusOf(mastery: number): Status {
  if (mastery >= 0.8) return 'strong';
  if (mastery >= 0.65) return 'ok';
  return 'weak';
}
