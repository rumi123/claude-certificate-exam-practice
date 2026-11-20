import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { getDb } from '../client';
import * as t from '../schema';
import type { AnsweredItem } from '@/lib/analytics/types';
import { isPreset, PRESET_NAMES } from '@/lib/engine/presets';
import type { Confidence } from '@/lib/types';
import { getDomains, getScenarios } from './catalog';

export function getAnsweredItems(): AnsweredItem[] {
  const db = getDb();
  const rows = db
    .select({ item: t.sessionItem, q: t.question })
    .from(t.sessionItem)
    .innerJoin(t.question, eq(t.question.id, t.sessionItem.questionId))
    .where(isNotNull(t.sessionItem.answeredAt))
    .orderBy(asc(t.sessionItem.answeredAt))
    .all();

  const secondary = new Map<string, string[]>();
  for (const r of db
    .select()
    .from(t.questionTask)
    .where(eq(t.questionTask.isPrimary, 0))
    .orderBy(asc(t.questionTask.taskId))
    .all()) {
    secondary.set(r.questionId, [...(secondary.get(r.questionId) ?? []), r.taskId]);
  }

  const options = new Map<string, { key: string; trapId: string | null }[]>();
  for (const o of db
    .select()
    .from(t.questionOption)
    .orderBy(asc(t.questionOption.questionId), asc(t.questionOption.position))
    .all()) {
    options.set(o.questionId, [
      ...(options.get(o.questionId) ?? []),
      { key: o.key, trapId: o.trapId },
    ]);
  }

  return rows.map(({ item, q }) => ({
    sessionId: item.sessionId,
    questionId: item.questionId,
    scenarioId: q.scenarioId,
    domainId: q.domainId,
    primaryTaskId: q.primaryTaskId,
    secondaryTaskIds: secondary.get(q.id) ?? [],
    selectCount: q.selectCount,
    isCorrect: item.isCorrect === 1,
    correctSelected: item.correctSelected ?? 0,
    confidence: (item.confidence as Confidence | null) ?? null,
    timeMs: item.timeMs,
    answeredAt: item.answeredAt!,
    selectedKeys: item.selectedJson ? (JSON.parse(item.selectedJson) as string[]) : [],
    optionTraps: options.get(q.id) ?? [],
  }));
}

export function getCompletedSessions(): {
  id: string;
  finishedAt: number;
  correct: number;
  answered: number;
}[] {
  const db = getDb();
  const sessions = db
    .select()
    .from(t.session)
    .where(and(eq(t.session.status, 'completed'), isNotNull(t.session.finishedAt)))
    .orderBy(asc(t.session.finishedAt))
    .all();
  const items = db.select().from(t.sessionItem).where(isNotNull(t.sessionItem.answeredAt)).all();
  return sessions.map((s) => {
    const own = items.filter((i) => i.sessionId === s.id);
    return {
      id: s.id,
      finishedAt: s.finishedAt!,
      correct: own.filter((i) => i.isCorrect === 1).length,
      answered: own.length,
    };
  });
}

export type SessionHistoryRow = {
  id: string;
  mode: 'study' | 'test';
  status: 'completed' | 'abandoned';
  finishedAt: number;
  source: string;
  total: number;
  answered: number;
  correct: number;
  timeUsedMs: number;
  marked: number;
};

export type SourceNames = { domains: Record<string, string>; scenarios: Record<string, string> };

function parseFilters(filtersJson: string): { source?: unknown; ids?: unknown; drill?: unknown } {
  try {
    const v: unknown = JSON.parse(filtersJson);
    return v !== null && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

// Human label for where a session's questions came from; unknown shapes fall back to "Practice".
export function sourceLabel(kind: string, filtersJson: string, names: SourceNames): string {
  if (kind === 'review') return 'Review';
  const f = parseFilters(filtersJson);
  const ids = Array.isArray(f.ids) ? f.ids.filter((x): x is string => typeof x === 'string') : [];
  switch (f.source) {
    case 'domain':
      return ids.length > 0 ? ids.map((id) => names.domains[id] ?? id).join(', ') : 'Practice';
    case 'scenario':
      return ids.length > 0 ? ids.map((id) => names.scenarios[id] ?? id).join(', ') : 'Practice';
    case 'task':
      return ids.length > 0
        ? `Task ${ids.join(', ')}${f.drill === true ? ' drill' : ''}`
        : 'Practice';
    case 'preset':
      return typeof ids[0] === 'string' && isPreset(ids[0]) ? PRESET_NAMES[ids[0]] : 'Practice';
    case 'mock':
      return ids[0]?.startsWith('mock-') ? `Mock ${ids[0].slice(5)}` : 'Practice';
    case 'all':
      return 'All questions';
    case 'mistakes':
      return 'Mistakes review';
    default:
      return 'Practice';
  }
}

// Every finished (completed or abandoned) session, newest first, with its counts.
export function getSessionHistory(mode?: 'study' | 'test'): SessionHistoryRow[] {
  const db = getDb();
  const sessions = db
    .select()
    .from(t.session)
    .where(
      and(
        inArray(t.session.status, ['completed', 'abandoned']),
        isNotNull(t.session.finishedAt),
        mode ? eq(t.session.mode, mode) : undefined,
      ),
    )
    .orderBy(desc(t.session.finishedAt), asc(t.session.id))
    .all();
  if (sessions.length === 0) return [];

  const counts = new Map(
    db
      .select({
        sessionId: t.sessionItem.sessionId,
        total: sql<number>`count(*)`,
        answered: sql<number>`coalesce(sum(case when ${t.sessionItem.answeredAt} is not null and ${t.sessionItem.selectedJson} is not null then 1 else 0 end), 0)`,
        correct: sql<number>`coalesce(sum(case when ${t.sessionItem.isCorrect} = 1 then 1 else 0 end), 0)`,
        marked: sql<number>`coalesce(sum(case when ${t.sessionItem.marked} = 1 then 1 else 0 end), 0)`,
      })
      .from(t.sessionItem)
      .groupBy(t.sessionItem.sessionId)
      .all()
      .map((r) => [r.sessionId, r]),
  );
  const names: SourceNames = {
    domains: Object.fromEntries(getDomains().map((d) => [d.id, d.name])),
    scenarios: Object.fromEntries(getScenarios().map((s) => [s.id, s.name])),
  };

  return sessions.map((s) => {
    const c = counts.get(s.id);
    return {
      id: s.id,
      mode: s.mode as 'study' | 'test',
      status: s.status as 'completed' | 'abandoned',
      finishedAt: s.finishedAt!,
      source: sourceLabel(s.kind, s.filtersJson, names),
      total: c?.total ?? 0,
      answered: c?.answered ?? 0,
      correct: c?.correct ?? 0,
      timeUsedMs: s.finishedAt! - s.startedAt,
      marked: c?.marked ?? 0,
    };
  });
}
