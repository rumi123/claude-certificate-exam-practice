import { and, asc, count, desc, eq, isNotNull } from 'drizzle-orm';
import { getDb } from '../client';
import * as t from '../schema';
import { getScenarios } from './catalog';

export type ContinueSession = { id: string; kind: string; answered: number; total: number };

export function getContinueSession(): ContinueSession | null {
  const db = getDb();
  const s = db
    .select()
    .from(t.session)
    .where(eq(t.session.status, 'in_progress'))
    .orderBy(desc(t.session.startedAt))
    .limit(1)
    .get();
  if (!s) return null;
  const total = db
    .select({ n: count() })
    .from(t.sessionItem)
    .where(eq(t.sessionItem.sessionId, s.id))
    .get();
  const answered = db
    .select({ n: count() })
    .from(t.sessionItem)
    .where(and(eq(t.sessionItem.sessionId, s.id), isNotNull(t.sessionItem.answeredAt)))
    .get();
  return { id: s.id, kind: s.kind, answered: answered?.n ?? 0, total: total?.n ?? 0 };
}

export type BankCoverage = {
  seen: number;
  total: number;
  perScenario: { id: string; name: string; seen: number; total: number }[];
};

// Bank questions answered at least once, overall and per scenario.
export function getBankCoverage(): BankCoverage {
  const db = getDb();
  const questions = db
    .select({ id: t.question.id, scenarioId: t.question.scenarioId })
    .from(t.question)
    .where(and(eq(t.question.retired, 0), eq(t.question.pool, 'practice')))
    .orderBy(asc(t.question.id))
    .all();
  const answered = new Set(
    db
      .selectDistinct({ id: t.sessionItem.questionId })
      .from(t.sessionItem)
      .where(isNotNull(t.sessionItem.answeredAt))
      .all()
      .map((r) => r.id),
  );
  const perScenario = getScenarios().map((s) => {
    const own = questions.filter((q) => q.scenarioId === s.id);
    return {
      id: s.id,
      name: s.name,
      seen: own.filter((q) => answered.has(q.id)).length,
      total: own.length,
    };
  });
  return {
    seen: questions.filter((q) => answered.has(q.id)).length,
    total: questions.length,
    perScenario,
  };
}
