import { buildReport, type Report } from '@/lib/report/build-report';
import { getDomains, getQuestionCountsByTask, getScenarios, getTasks, getTraps } from './catalog';
import { getAnsweredItems, getCompletedSessions } from './history';
import { getDueCount } from './review';

export function loadReport(now: number): Report {
  return buildReport({
    items: getAnsweredItems(),
    sessions: getCompletedSessions(),
    tasks: getTasks().map((t) => ({ id: t.id, title: t.title, domainId: t.domainId })),
    domains: getDomains().map((d) => ({ id: d.id, name: d.name, weight: d.weight })),
    scenarios: getScenarios().map((s) => ({ id: s.id, name: s.name })),
    traps: getTraps().map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      principle: t.principle,
    })),
    bankCountsByTask: getQuestionCountsByTask(),
    dueCount: getDueCount(now),
    now,
  });
}
