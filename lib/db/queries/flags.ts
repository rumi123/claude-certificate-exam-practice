import { asc, eq } from 'drizzle-orm';
import { getDb } from '../client';
import * as t from '../schema';

export type OpenFlag = {
  id: number;
  questionId: string;
  stem: string;
  note: string;
  createdAt: number;
};

// Unresolved flags, oldest first.
export function getOpenFlags(): OpenFlag[] {
  return getDb()
    .select({
      id: t.questionFlag.id,
      questionId: t.questionFlag.questionId,
      stem: t.question.stem,
      note: t.questionFlag.note,
      createdAt: t.questionFlag.createdAt,
    })
    .from(t.questionFlag)
    .innerJoin(t.question, eq(t.question.id, t.questionFlag.questionId))
    .where(eq(t.questionFlag.resolved, 0))
    .orderBy(asc(t.questionFlag.createdAt), asc(t.questionFlag.id))
    .all()
    .map((r) => ({ ...r, note: r.note ?? '' }));
}

export function resolveFlagById(id: number): void {
  getDb().transaction((tx) => {
    tx.update(t.questionFlag).set({ resolved: 1 }).where(eq(t.questionFlag.id, id)).run();
  });
}
