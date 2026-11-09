import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { getDb } from '../client';
import * as t from '../schema';
import type { AnsweredItem } from '@/lib/analytics/types';
import type { Confidence } from '@/lib/types';

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
