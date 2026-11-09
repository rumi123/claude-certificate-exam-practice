import { and, asc, count, gt, isNull, lte, min } from 'drizzle-orm';
import { getDb } from '../client';
import * as t from '../schema';

export const MAX_REVIEW_SIZE = 50;

export type ReviewStats = {
  dueNow: number;
  perBox: [number, number, number, number, number];
  retired: number;
  nextDueAt: number | null;
};

// Due, not retired, oldest due first.
export function getDueQuestionIds(now: number, limit = MAX_REVIEW_SIZE): string[] {
  return getDb()
    .select({ id: t.reviewItem.questionId })
    .from(t.reviewItem)
    .where(and(isNull(t.reviewItem.retiredAt), lte(t.reviewItem.dueAt, now)))
    .orderBy(asc(t.reviewItem.dueAt), asc(t.reviewItem.questionId))
    .limit(limit)
    .all()
    .map((r) => r.id);
}

export function getReviewStats(now: number): ReviewStats {
  const db = getDb();
  const active = db
    .select({ box: t.reviewItem.box, n: count() })
    .from(t.reviewItem)
    .where(isNull(t.reviewItem.retiredAt))
    .groupBy(t.reviewItem.box)
    .all();
  const perBox: ReviewStats['perBox'] = [0, 0, 0, 0, 0];
  for (const r of active) if (r.box >= 1 && r.box <= 5) perBox[r.box - 1] = r.n;
  const due = db
    .select({ n: count() })
    .from(t.reviewItem)
    .where(and(isNull(t.reviewItem.retiredAt), lte(t.reviewItem.dueAt, now)))
    .get();
  const all = db.select({ n: count() }).from(t.reviewItem).get();
  const next = db
    .select({ at: min(t.reviewItem.dueAt) })
    .from(t.reviewItem)
    .where(and(isNull(t.reviewItem.retiredAt), gt(t.reviewItem.dueAt, now)))
    .get();
  const total = all?.n ?? 0;
  return {
    dueNow: due?.n ?? 0,
    perBox,
    retired: total - perBox.reduce((a, b) => a + b, 0),
    nextDueAt: next?.at ?? null,
  };
}

export function getDueCount(now: number): number {
  const row = getDb()
    .select({ n: count() })
    .from(t.reviewItem)
    .where(and(isNull(t.reviewItem.retiredAt), lte(t.reviewItem.dueAt, now)))
    .get();
  return row?.n ?? 0;
}
