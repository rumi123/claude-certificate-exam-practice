import { and, asc, count, eq, isNotNull } from 'drizzle-orm';
import { getDb } from '../client';
import * as t from '../schema';

export function getScenarios() {
  return getDb().select().from(t.scenario).orderBy(asc(t.scenario.id)).all();
}

export function getDomains() {
  return getDb().select().from(t.domain).orderBy(asc(t.domain.id)).all();
}

export function getTasks() {
  return getDb().select().from(t.taskStatement).orderBy(asc(t.taskStatement.id)).all();
}

export function getTraps() {
  return getDb().select().from(t.trap).orderBy(asc(t.trap.id)).all();
}

// Task of each trap's first anti-pattern flashcard, used for the "Drill" links.
export function getTrapDrillTasks(): Record<string, string> {
  const rows = getDb()
    .select({ trapId: t.flashcard.trapId, taskId: t.flashcard.taskId })
    .from(t.flashcard)
    .where(
      and(
        eq(t.flashcard.deck, 'anti-patterns'),
        isNotNull(t.flashcard.trapId),
        isNotNull(t.flashcard.taskId),
      ),
    )
    .orderBy(asc(t.flashcard.id))
    .all();
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (r.trapId && r.taskId && !(r.trapId in out)) out[r.trapId] = r.taskId;
  }
  return out;
}

export function getQuestionCountsByTask(): Record<string, number> {
  const rows = getDb()
    .select({ taskId: t.question.primaryTaskId, n: count() })
    .from(t.question)
    .where(eq(t.question.retired, 0))
    .groupBy(t.question.primaryTaskId)
    .all();
  return Object.fromEntries(rows.map((r) => [r.taskId, r.n]));
}

export function getQuestionWithOptions(id: string) {
  const db = getDb();
  const q = db.select().from(t.question).where(eq(t.question.id, id)).get();
  if (!q) return null;
  const options = db
    .select()
    .from(t.questionOption)
    .where(eq(t.questionOption.questionId, id))
    .orderBy(asc(t.questionOption.position))
    .all();
  return { ...q, options };
}
