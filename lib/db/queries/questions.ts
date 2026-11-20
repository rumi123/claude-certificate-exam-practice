import { and, asc, eq, isNotNull, sql, type SQL } from 'drizzle-orm';
import { displayLetter } from '@/lib/engine/session';
import type { Confidence, SessionKind } from '@/lib/types';
import { getDb } from '../client';
import * as t from '../schema';

export const PAGE_SIZE = 25;

export type QuestionFilters = {
  scenario?: string;
  domain?: string;
  task?: string;
  type?: 'single' | 'multi';
  difficulty?: number;
  seen?: 'seen' | 'unseen';
  last?: 'right' | 'wrong';
  flagged?: boolean;
  marked?: boolean;
  q?: string;
  page: number;
};

export type QuestionRow = {
  id: string;
  scenarioId: string;
  primaryTaskId: string;
  type: string;
  difficulty: number;
  stem: string;
  lastResult: 'right' | 'wrong' | null;
  flagged: boolean;
  marked: boolean;
};

function likePattern(q: string): string {
  return `%${q.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// Practice pool, not retired. `flagged` means at least one unresolved flag.
export function searchQuestions(filters: QuestionFilters): { rows: QuestionRow[]; total: number } {
  const db = getDb();
  const conds: SQL[] = [eq(t.question.pool, 'practice'), eq(t.question.retired, 0)];
  if (filters.scenario) conds.push(eq(t.question.scenarioId, filters.scenario));
  if (filters.domain) conds.push(eq(t.question.domainId, filters.domain));
  if (filters.task) conds.push(eq(t.question.primaryTaskId, filters.task));
  if (filters.type) conds.push(eq(t.question.type, filters.type));
  if (filters.difficulty !== undefined) conds.push(eq(t.question.difficulty, filters.difficulty));
  const text = filters.q?.trim();
  if (text) conds.push(sql`lower(${t.question.stem}) like ${likePattern(text)} escape '\\'`);

  const base = db
    .select({
      id: t.question.id,
      scenarioId: t.question.scenarioId,
      primaryTaskId: t.question.primaryTaskId,
      type: t.question.type,
      difficulty: t.question.difficulty,
      stem: t.question.stem,
    })
    .from(t.question)
    .where(and(...conds))
    .orderBy(asc(t.question.id))
    .all();

  const answered = db
    .select({
      questionId: t.sessionItem.questionId,
      isCorrect: t.sessionItem.isCorrect,
    })
    .from(t.sessionItem)
    .where(isNotNull(t.sessionItem.answeredAt))
    .orderBy(asc(t.sessionItem.answeredAt))
    .all();
  const lastResult = new Map<string, 'right' | 'wrong'>();
  for (const a of answered) lastResult.set(a.questionId, a.isCorrect === 1 ? 'right' : 'wrong');

  const flaggedIds = new Set(
    db
      .select({ id: t.questionFlag.questionId })
      .from(t.questionFlag)
      .where(eq(t.questionFlag.resolved, 0))
      .all()
      .map((r) => r.id),
  );

  const markedIds = new Set(
    db
      .selectDistinct({ id: t.sessionItem.questionId })
      .from(t.sessionItem)
      .where(eq(t.sessionItem.marked, 1))
      .all()
      .map((r) => r.id),
  );

  const all = base
    .map((r): QuestionRow => ({
      ...r,
      lastResult: lastResult.get(r.id) ?? null,
      flagged: flaggedIds.has(r.id),
      marked: markedIds.has(r.id),
    }))
    .filter((r) => {
      if (filters.seen === 'seen' && r.lastResult === null) return false;
      if (filters.seen === 'unseen' && r.lastResult !== null) return false;
      if (filters.last && r.lastResult !== filters.last) return false;
      if (filters.flagged && !r.flagged) return false;
      if (filters.marked && !r.marked) return false;
      return true;
    });
  const start = (Math.max(1, filters.page) - 1) * PAGE_SIZE;
  return { rows: all.slice(start, start + PAGE_SIZE), total: all.length };
}

export type HistoryRow = {
  answeredAt: number;
  kind: SessionKind;
  optionOrder: string[];
  selected: string[];
  letters: string[];
  isCorrect: boolean;
  confidence: Confidence | null;
  timeMs: number | null;
};

// Every answered item of the question, oldest first; letters as they were displayed.
export function getQuestionHistory(id: string): HistoryRow[] {
  const rows = getDb()
    .select({
      answeredAt: t.sessionItem.answeredAt,
      kind: t.session.kind,
      optionOrderJson: t.sessionItem.optionOrderJson,
      selectedJson: t.sessionItem.selectedJson,
      isCorrect: t.sessionItem.isCorrect,
      confidence: t.sessionItem.confidence,
      timeMs: t.sessionItem.timeMs,
    })
    .from(t.sessionItem)
    .innerJoin(t.session, eq(t.session.id, t.sessionItem.sessionId))
    .where(and(eq(t.sessionItem.questionId, id), isNotNull(t.sessionItem.answeredAt)))
    .orderBy(asc(t.sessionItem.answeredAt))
    .all();
  return rows.map((r) => {
    const order = JSON.parse(r.optionOrderJson) as string[];
    const selected = r.selectedJson ? (JSON.parse(r.selectedJson) as string[]) : [];
    return {
      answeredAt: r.answeredAt ?? 0,
      kind: r.kind as SessionKind,
      optionOrder: order,
      selected,
      letters: selected
        .map((k) => order.indexOf(k))
        .filter((i) => i >= 0)
        .map(displayLetter)
        .sort(),
      isCorrect: r.isCorrect === 1,
      confidence: r.confidence as Confidence | null,
      timeMs: r.timeMs,
    };
  });
}

// False when the question does not exist.
export function isMarked(questionId: string): boolean {
  return !!getDb()
    .select({ id: t.sessionItem.questionId })
    .from(t.sessionItem)
    .where(and(eq(t.sessionItem.questionId, questionId), eq(t.sessionItem.marked, 1)))
    .limit(1)
    .get();
}

// Unmarks the question in every session; returns the number of rows changed.
export function clearMarks(questionId: string): number {
  return getDb().transaction((tx) =>
    tx
      .update(t.sessionItem)
      .set({ marked: 0 })
      .where(and(eq(t.sessionItem.questionId, questionId), eq(t.sessionItem.marked, 1)))
      .run().changes,
  );
}

export function addFlag(questionId: string, note: string, at: number): boolean {
  return getDb().transaction((tx) => {
    const q = tx
      .select({ id: t.question.id })
      .from(t.question)
      .where(eq(t.question.id, questionId))
      .get();
    if (!q) return false;
    tx.insert(t.questionFlag).values({ questionId, note, createdAt: at, resolved: 0 }).run();
    return true;
  });
}
