import { and, asc, eq, inArray, isNotNull, isNull, max, ne, sql } from 'drizzle-orm';
import { now } from '@/lib/clock';
import { displayLetter, type PlanItem } from '@/lib/engine/session';
import { score } from '@/lib/engine/scoring';
import { filterCandidates, type SetupFilter } from '@/lib/engine/setup-schema';
import type { Candidate } from '@/lib/engine/selection';
import type { Lesson } from '@/lib/content/schemas';
import { buildLessonView, type FeedbackData } from '@/lib/feedback';
import { defaultRng, shuffle } from '@/lib/rng';
import { nextReviewState, type ReviewState } from '@/lib/srs/leitner';
import type { Confidence, Mode, ReviewEffect, SessionKind } from '@/lib/types';
import { getDb, type Db } from '../client';
import * as t from '../schema';

export function getCandidates(filter: SetupFilter = {}, pool = 'practice'): Candidate[] {
  const db = getDb();
  const rows = db
    .select({
      id: t.question.id,
      scenarioId: t.question.scenarioId,
      type: t.question.type,
      primaryTaskId: t.question.primaryTaskId,
      domainId: t.question.domainId,
    })
    .from(t.question)
    .where(and(eq(t.question.pool, pool), eq(t.question.retired, 0)))
    .orderBy(asc(t.question.id))
    .all();
  const seen = db
    .select({ questionId: t.sessionItem.questionId, last: max(t.sessionItem.answeredAt) })
    .from(t.sessionItem)
    .groupBy(t.sessionItem.questionId)
    .all();
  const lastSeen = new Map(seen.map((s) => [s.questionId, s.last]));
  const cands: Candidate[] = rows.map((r) => ({
    ...r,
    type: r.type as Candidate['type'],
    lastSeenAt: lastSeen.get(r.id) ?? null,
  }));
  return filterCandidates(cands, filter);
}

// Names of the active mock papers, oldest first.
export function getMockPools(): string[] {
  return getDb()
    .selectDistinct({ pool: t.question.pool })
    .from(t.question)
    .where(and(ne(t.question.pool, 'practice'), eq(t.question.retired, 0)))
    .all()
    .map((r) => r.pool)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function getOptionKeys(questionIds: string[]): Record<string, string[]> {
  if (questionIds.length === 0) return {};
  const rows = getDb()
    .select({ questionId: t.questionOption.questionId, key: t.questionOption.key })
    .from(t.questionOption)
    .where(inArray(t.questionOption.questionId, questionIds))
    .orderBy(asc(t.questionOption.position))
    .all();
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.questionId] ??= []).push(r.key);
  return out;
}

export function createSession(input: {
  kind: SessionKind;
  mode: Mode;
  filters: unknown;
  timeLimitS: number | null;
  items: PlanItem[];
}): string {
  const id = crypto.randomUUID();
  getDb().transaction((tx) => {
    tx.insert(t.session)
      .values({
        id,
        kind: input.kind,
        mode: input.mode,
        filtersJson: JSON.stringify(input.filters),
        status: 'in_progress',
        timeLimitS: input.timeLimitS,
        startedAt: now(),
      })
      .run();
    for (const item of input.items) {
      tx.insert(t.sessionItem)
        .values({
          sessionId: id,
          position: item.position,
          questionId: item.questionId,
          optionOrderJson: JSON.stringify(item.optionOrder),
        })
        .run();
    }
  });
  return id;
}

export type SessionItemView = {
  position: number;
  questionId: string;
  stem: string;
  type: 'single' | 'multi';
  selectCount: number;
  scenario: { id: string; name: string; setup: string };
  optionOrder: string[];
  options: { key: string; letter: string; text: string }[];
  answered: boolean;
  marked: boolean;
  selected: string[] | null;
  confidence: Confidence | null;
};

export type SessionView = {
  session: typeof t.session.$inferSelect;
  items: SessionItemView[];
};

export function getSessionView(sessionId: string): SessionView | null {
  const db = getDb();
  const session = db.select().from(t.session).where(eq(t.session.id, sessionId)).get();
  if (!session) return null;
  const rows = db
    .select({
      item: t.sessionItem,
      stem: t.question.stem,
      type: t.question.type,
      selectCount: t.question.selectCount,
      scenarioId: t.scenario.id,
      scenarioName: t.scenario.name,
      scenarioSetup: t.scenario.setup,
    })
    .from(t.sessionItem)
    .innerJoin(t.question, eq(t.question.id, t.sessionItem.questionId))
    .innerJoin(t.scenario, eq(t.scenario.id, t.question.scenarioId))
    .where(eq(t.sessionItem.sessionId, sessionId))
    .orderBy(asc(t.sessionItem.position))
    .all();
  const ids = [...new Set(rows.map((r) => r.item.questionId))];
  const optionRows = ids.length
    ? db.select().from(t.questionOption).where(inArray(t.questionOption.questionId, ids)).all()
    : [];
  const texts = new Map(optionRows.map((o) => [`${o.questionId}:${o.key}`, o.text]));
  const items = rows.map((r): SessionItemView => {
    const optionOrder = JSON.parse(r.item.optionOrderJson) as string[];
    return {
      position: r.item.position,
      questionId: r.item.questionId,
      stem: r.stem,
      type: r.type as 'single' | 'multi',
      selectCount: r.selectCount,
      scenario: { id: r.scenarioId, name: r.scenarioName, setup: r.scenarioSetup },
      optionOrder,
      options: optionOrder.map((key, i) => ({
        key,
        letter: displayLetter(i),
        text: texts.get(`${r.item.questionId}:${key}`) ?? '',
      })),
      answered: r.item.answeredAt !== null,
      marked: r.item.marked === 1,
      selected: r.item.selectedJson ? (JSON.parse(r.item.selectedJson) as string[]) : null,
      confidence: r.item.confidence as Confidence | null,
    };
  });
  return { session, items };
}

export function getSessionResult(sessionId: string): { total: number; correct: number } {
  const row = getDb()
    .select({
      total: sql<number>`count(*)`,
      correct: sql<number>`coalesce(sum(${t.sessionItem.isCorrect}), 0)`,
    })
    .from(t.sessionItem)
    .where(eq(t.sessionItem.sessionId, sessionId))
    .get();
  return { total: row?.total ?? 0, correct: row?.correct ?? 0 };
}

export type RecordAnswerInput = {
  sessionId: string;
  position: number;
  selected: string[];
  confidence: Confidence;
  timeMs: number;
};

// When `expired` is true the deadline had passed: the session was finished by the timer, the
// answer was dropped, and the other fields are placeholders.
export type RecordAnswerResult = {
  isCorrect: boolean;
  correctSelected: number;
  completed: boolean;
  expired: boolean;
  mode: Mode;
  questionId: string;
  optionOrder: string[];
};

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type SessionRow = typeof t.session.$inferSelect;
export type FinishReason = 'user' | 'timer';

export function deadlineOf(s: Pick<SessionRow, 'startedAt' | 'timeLimitS'>): number | null {
  return s.timeLimitS === null ? null : s.startedAt + s.timeLimitS * 1000;
}

function isExpired(s: Pick<SessionRow, 'startedAt' | 'timeLimitS'>): boolean {
  const deadline = deadlineOf(s);
  return deadline !== null && now() > deadline;
}

// Leitner update for one answered item; returns the effect to store on the item.
function applyReview(
  tx: Tx,
  questionId: string,
  isCorrect: boolean,
  confidence: Confidence | null,
  at: number,
): ReviewEffect {
  const row = tx.select().from(t.reviewItem).where(eq(t.reviewItem.questionId, questionId)).get();
  const current: ReviewState | null = row
    ? {
        box: row.box as ReviewState['box'],
        dueAt: row.dueAt,
        lapses: row.lapses,
        retiredAt: row.retiredAt,
      }
    : null;
  const { state, effect } = nextReviewState(current, isCorrect, confidence, at);
  if (state && effect !== 'none') {
    const values = { ...state, lastSeenAt: at };
    tx.insert(t.reviewItem)
      .values({ questionId, ...values })
      .onConflictDoUpdate({ target: t.reviewItem.questionId, set: values })
      .run();
  }
  return effect;
}

// Test mode: the Leitner update for every answered item, in position order, once.
function applyReviewForAnswered(tx: Tx, sessionId: string, at: number): void {
  const rows = tx
    .select()
    .from(t.sessionItem)
    .where(and(eq(t.sessionItem.sessionId, sessionId), isNotNull(t.sessionItem.answeredAt)))
    .orderBy(asc(t.sessionItem.position))
    .all();
  for (const r of rows) {
    const effect = applyReview(
      tx,
      r.questionId,
      r.isCorrect === 1,
      r.confidence as Confidence | null,
      at,
    );
    tx.update(t.sessionItem)
      .set({ reviewEffect: effect })
      .where(and(eq(t.sessionItem.sessionId, sessionId), eq(t.sessionItem.position, r.position)))
      .run();
  }
}

function dropUnanswered(tx: Tx, sessionId: string): void {
  tx.delete(t.sessionItem)
    .where(and(eq(t.sessionItem.sessionId, sessionId), isNull(t.sessionItem.answeredAt)))
    .run();
}

function finishIn(tx: Tx, sess: SessionRow, reason: FinishReason): void {
  if (sess.status !== 'in_progress') return;
  const at = now();
  const test = sess.mode === 'test';
  if (test || reason === 'timer') {
    // Unanswered items count as wrong. In study mode they are the only ones not yet reviewed.
    const blanks = tx
      .select()
      .from(t.sessionItem)
      .where(and(eq(t.sessionItem.sessionId, sess.id), isNull(t.sessionItem.answeredAt)))
      .orderBy(asc(t.sessionItem.position))
      .all();
    for (const b of blanks) {
      const effect = test ? null : applyReview(tx, b.questionId, false, null, at);
      tx.update(t.sessionItem)
        .set({
          selectedJson: '[]',
          isCorrect: 0,
          correctSelected: 0,
          confidence: null,
          answeredAt: at,
          reviewEffect: effect,
        })
        .where(and(eq(t.sessionItem.sessionId, sess.id), eq(t.sessionItem.position, b.position)))
        .run();
    }
  } else {
    dropUnanswered(tx, sess.id);
  }
  if (test) applyReviewForAnswered(tx, sess.id, at);
  tx.update(t.session)
    .set({ status: 'completed', finishedAt: at })
    .where(eq(t.session.id, sess.id))
    .run();
}

function getSession(tx: Tx, sessionId: string): SessionRow {
  const sess = tx.select().from(t.session).where(eq(t.session.id, sessionId)).get();
  if (!sess) throw new Error('Session not found');
  return sess;
}

export function recordAnswer(input: RecordAnswerInput): RecordAnswerResult {
  return getDb().transaction((tx) => {
    const sess = getSession(tx, input.sessionId);
    if (sess.status !== 'in_progress') throw new Error('Session is finished');
    const mode = sess.mode as Mode;
    const item = tx
      .select()
      .from(t.sessionItem)
      .where(
        and(
          eq(t.sessionItem.sessionId, input.sessionId),
          eq(t.sessionItem.position, input.position),
        ),
      )
      .get();
    if (!item) throw new Error('Question not in this session');
    const optionOrder = JSON.parse(item.optionOrderJson) as string[];
    if (isExpired(sess)) {
      finishIn(tx, sess, 'timer');
      return {
        isCorrect: false,
        correctSelected: 0,
        completed: true,
        expired: true,
        mode,
        questionId: item.questionId,
        optionOrder,
      };
    }
    // Test mode lets an answer be changed until the session is finished.
    if (item.answeredAt !== null && mode === 'study') throw new Error('Question already answered');

    const q = tx.select().from(t.question).where(eq(t.question.id, item.questionId)).get();
    if (!q) throw new Error('Question not found');
    const opts = tx
      .select()
      .from(t.questionOption)
      .where(eq(t.questionOption.questionId, q.id))
      .all();
    const keys = new Set(opts.map((o) => o.key));
    const picked = new Set(input.selected);
    if (picked.size !== input.selected.length || picked.size !== q.selectCount) {
      throw new Error(`Select exactly ${q.selectCount} option(s)`);
    }
    if (input.selected.some((k) => !keys.has(k))) throw new Error('Unknown option selected');

    const { isCorrect, correctSelected } = score(
      opts.filter((o) => o.isCorrect === 1).map((o) => o.key),
      input.selected,
    );
    const at = now();
    // Study mode updates the Leitner state now; test mode does it once, at finish.
    const effect = mode === 'study' ? applyReview(tx, q.id, isCorrect, input.confidence, at) : null;

    tx.update(t.sessionItem)
      .set({
        selectedJson: JSON.stringify(input.selected),
        isCorrect: isCorrect ? 1 : 0,
        correctSelected,
        confidence: input.confidence,
        timeMs: input.timeMs,
        answeredAt: at,
        reviewEffect: effect,
      })
      .where(
        and(
          eq(t.sessionItem.sessionId, input.sessionId),
          eq(t.sessionItem.position, input.position),
        ),
      )
      .run();

    let completed = false;
    if (mode === 'study') {
      const open = tx
        .select({ n: sql<number>`count(*)` })
        .from(t.sessionItem)
        .where(and(eq(t.sessionItem.sessionId, input.sessionId), isNull(t.sessionItem.answeredAt)))
        .get();
      completed = (open?.n ?? 0) === 0;
      if (completed) {
        tx.update(t.session)
          .set({ status: 'completed', finishedAt: at })
          .where(eq(t.session.id, input.sessionId))
          .run();
      }
    }
    return {
      isCorrect,
      correctSelected,
      completed,
      expired: false,
      mode,
      questionId: q.id,
      optionOrder,
    };
  });
}

export function setMarked(sessionId: string, position: number, marked: boolean): void {
  getDb().transaction((tx) => {
    getSession(tx, sessionId);
    const res = tx
      .update(t.sessionItem)
      .set({ marked: marked ? 1 : 0 })
      .where(and(eq(t.sessionItem.sessionId, sessionId), eq(t.sessionItem.position, position)))
      .run();
    if (res.changes === 0) throw new Error('Question not in this session');
  });
}

// No-op when the session is already finished.
export function finishSession(sessionId: string, reason: FinishReason): void {
  getDb().transaction((tx) => finishIn(tx, getSession(tx, sessionId), reason));
}

// Finishes a session whose deadline has passed; true when it did (false for an unknown id).
export function finishIfExpired(sessionId: string): boolean {
  return getDb().transaction((tx) => {
    const sess = tx.select().from(t.session).where(eq(t.session.id, sessionId)).get();
    if (!sess || sess.status !== 'in_progress' || !isExpired(sess)) return false;
    finishIn(tx, sess, 'timer');
    return true;
  });
}

export function abandonSession(sessionId: string): void {
  getDb().transaction((tx) => {
    const sess = getSession(tx, sessionId);
    if (sess.status !== 'in_progress') return;
    const at = now();
    if (sess.mode === 'test') applyReviewForAnswered(tx, sessionId, at);
    dropUnanswered(tx, sessionId);
    tx.update(t.session)
      .set({ status: 'abandoned', finishedAt: at })
      .where(eq(t.session.id, sessionId))
      .run();
  });
}

export type SummaryRow = {
  id: string;
  name: string;
  answered: number;
  correct: number;
  accuracy: number;
};

export type SummaryItem = {
  position: number;
  questionId: string;
  /** `practice` questions have a page at /questions/[id]; mock questions don't. */
  pool: string;
  stem: string;
  answered: boolean;
  isCorrect: boolean;
  selected: string[];
  optionOrder: string[];
  confidence: Confidence | null;
  timeMs: number | null;
  marked: boolean;
};

export type Summary = {
  session: SessionRow;
  total: number;
  answered: number;
  correct: number;
  timeUsedMs: number | null;
  meanSecondsPerQuestion: number | null;
  byDomain: SummaryRow[];
  byTask: SummaryRow[];
  traps: { id: string; name: string; count: number }[];
  calibration: { blindSpots: number; luckyGuesses: number; unsure: number };
  reviewEntered: number;
  slowItems: number;
  items: SummaryItem[];
};

export const TARGET_SECONDS_PER_QUESTION = 120;
export const SLOW_ITEM_MS = 180_000;

function tally(
  rows: { id: string; name: string; answered: boolean; correct: boolean }[],
): SummaryRow[] {
  const by = new Map<string, SummaryRow>();
  for (const r of rows) {
    const row = by.get(r.id) ?? { id: r.id, name: r.name, answered: 0, correct: 0, accuracy: 0 };
    if (r.answered) row.answered += 1;
    if (r.correct) row.correct += 1;
    by.set(r.id, row);
  }
  return [...by.values()]
    .map((r) => ({ ...r, accuracy: r.answered ? r.correct / r.answered : 0 }))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

// Null while the session is in progress: results are never sent before it is finished.
export function getSummary(sessionId: string): Summary | null {
  const db = getDb();
  const session = db.select().from(t.session).where(eq(t.session.id, sessionId)).get();
  if (!session || session.status === 'in_progress') return null;
  const rows = db
    .select({
      item: t.sessionItem,
      stem: t.question.stem,
      pool: t.question.pool,
      domainId: t.domain.id,
      domainName: t.domain.name,
      taskId: t.taskStatement.id,
      taskTitle: t.taskStatement.title,
    })
    .from(t.sessionItem)
    .innerJoin(t.question, eq(t.question.id, t.sessionItem.questionId))
    .innerJoin(t.domain, eq(t.domain.id, t.question.domainId))
    .innerJoin(t.taskStatement, eq(t.taskStatement.id, t.question.primaryTaskId))
    .where(eq(t.sessionItem.sessionId, sessionId))
    .orderBy(asc(t.sessionItem.position))
    .all();

  const ids = [...new Set(rows.map((r) => r.item.questionId))];
  const trapRows = ids.length
    ? db
        .select({
          questionId: t.questionOption.questionId,
          key: t.questionOption.key,
          trapId: t.questionOption.trapId,
          trapName: t.trap.name,
        })
        .from(t.questionOption)
        .innerJoin(t.trap, eq(t.trap.id, t.questionOption.trapId))
        .where(and(inArray(t.questionOption.questionId, ids), eq(t.questionOption.isCorrect, 0)))
        .all()
    : [];
  const trapOf = new Map(trapRows.map((r) => [`${r.questionId}:${r.key}`, r]));

  const items: SummaryItem[] = [];
  const trapCounts = new Map<string, { id: string; name: string; count: number }>();
  const cal = { blindSpots: 0, luckyGuesses: 0, unsure: 0 };
  let timeSum = 0;
  let timeN = 0;
  let reviewEntered = 0;
  let slowItems = 0;
  for (const r of rows) {
    const selected = r.item.selectedJson ? (JSON.parse(r.item.selectedJson) as string[]) : [];
    const answered = r.item.answeredAt !== null && selected.length > 0;
    const isCorrect = r.item.isCorrect === 1;
    const confidence = r.item.confidence as Confidence | null;
    if (answered) {
      for (const key of selected) {
        const tr = trapOf.get(`${r.item.questionId}:${key}`);
        if (!tr?.trapId) continue;
        const c = trapCounts.get(tr.trapId) ?? { id: tr.trapId, name: tr.trapName, count: 0 };
        c.count += 1;
        trapCounts.set(tr.trapId, c);
      }
      if (confidence === 'sure' && !isCorrect) cal.blindSpots += 1;
      if (confidence === 'guess' && isCorrect) cal.luckyGuesses += 1;
      if (confidence === 'unsure') cal.unsure += 1;
    }
    if (r.item.timeMs !== null) {
      timeSum += r.item.timeMs;
      timeN += 1;
      if (r.item.timeMs > SLOW_ITEM_MS) slowItems += 1;
    }
    if (r.item.reviewEffect === 'entered') reviewEntered += 1;
    items.push({
      position: r.item.position,
      questionId: r.item.questionId,
      pool: r.pool,
      stem: r.stem,
      answered,
      isCorrect,
      selected,
      optionOrder: JSON.parse(r.item.optionOrderJson) as string[],
      confidence,
      timeMs: r.item.timeMs,
      marked: r.item.marked === 1,
    });
  }

  const flags = rows.map((r, i) => ({
    answered: items[i].answered,
    correct: items[i].isCorrect,
  }));
  return {
    session,
    total: rows.length,
    answered: items.filter((i) => i.answered).length,
    correct: items.filter((i) => i.isCorrect).length,
    timeUsedMs: session.finishedAt === null ? null : session.finishedAt - session.startedAt,
    meanSecondsPerQuestion: timeN ? timeSum / timeN / 1000 : null,
    byDomain: tally(rows.map((r, i) => ({ id: r.domainId, name: r.domainName, ...flags[i] }))),
    byTask: tally(rows.map((r, i) => ({ id: r.taskId, name: r.taskTitle, ...flags[i] }))),
    traps: [...trapCounts.values()].sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)),
    calibration: cal,
    reviewEntered,
    slowItems,
    items,
  };
}

// A study-mode session of the wrong items of `sessionId`: same questions, new shuffle.
export function createMistakesSession(sessionId: string): string {
  const wrong = getDb()
    .select()
    .from(t.sessionItem)
    .where(and(eq(t.sessionItem.sessionId, sessionId), eq(t.sessionItem.isCorrect, 0)))
    .orderBy(asc(t.sessionItem.position))
    .all();
  if (wrong.length === 0) throw new Error('No mistakes to review');
  return createSession({
    kind: 'practice',
    mode: 'study',
    filters: { source: 'mistakes', sessionId },
    timeLimitS: null,
    items: wrong.map((w, position) => ({
      questionId: w.questionId,
      position,
      optionOrder: shuffle(JSON.parse(w.optionOrderJson) as string[], defaultRng),
    })),
  });
}

// An empty `selected` means "no answer shown yet": the banner is left out.
export function getFeedback(
  questionId: string,
  selected: string[],
  optionOrder: string[],
): FeedbackData {
  const db = getDb();
  const q = db
    .select({
      q: t.question,
      scenario: t.scenario.name,
      domain: t.domain.name,
      taskTitle: t.taskStatement.title,
      researchAnchor: t.taskStatement.researchAnchor,
      lessonUrl: t.taskStatement.lessonUrl,
    })
    .from(t.question)
    .innerJoin(t.scenario, eq(t.scenario.id, t.question.scenarioId))
    .innerJoin(t.domain, eq(t.domain.id, t.question.domainId))
    .innerJoin(t.taskStatement, eq(t.taskStatement.id, t.question.primaryTaskId))
    .where(eq(t.question.id, questionId))
    .get();
  if (!q) throw new Error('Question not found');

  const opts = db
    .select({ o: t.questionOption, trapName: t.trap.name, trapDescription: t.trap.description })
    .from(t.questionOption)
    .leftJoin(t.trap, eq(t.trap.id, t.questionOption.trapId))
    .where(eq(t.questionOption.questionId, questionId))
    .all();
  const byKey = new Map(opts.map((r) => [r.o.key, r]));
  const picked = new Set(selected);

  const secondary = db
    .select({ id: t.taskStatement.id, title: t.taskStatement.title })
    .from(t.questionTask)
    .innerJoin(t.taskStatement, eq(t.taskStatement.id, t.questionTask.taskId))
    .where(and(eq(t.questionTask.questionId, questionId), eq(t.questionTask.isPrimary, 0)))
    .orderBy(asc(t.taskStatement.id))
    .all();

  const lessonRow = db
    .select({ json: t.questionLesson.lessonJson })
    .from(t.questionLesson)
    .where(eq(t.questionLesson.questionId, questionId))
    .get();
  const parsedLesson = lessonRow ? (JSON.parse(lessonRow.json) as Lesson) : null;
  // Option keys come from the DB as plain strings; the lesson's record is keyed by option id.
  const lessonOptions: Partial<Record<string, Lesson['options'][keyof Lesson['options']]>> =
    parsedLesson?.options ?? {};

  const options = optionOrder.flatMap((key, i) => {
    const r = byKey.get(key);
    if (!r) return [];
    return [
      {
        letter: displayLetter(i),
        key,
        text: r.o.text,
        isCorrect: r.o.isCorrect === 1,
        selected: picked.has(key),
        explanation: r.o.explanation,
        reasoning: lessonOptions[key]?.reasoning ?? null,
        tempting: lessonOptions[key]?.tempting ?? null,
        trap:
          r.o.trapId && r.trapName
            ? { id: r.o.trapId, name: r.trapName, description: r.trapDescription ?? '' }
            : null,
      },
    ];
  });

  const result =
    selected.length === 0
      ? null
      : {
          ...score(
            opts.filter((r) => r.o.isCorrect === 1).map((r) => r.o.key),
            selected,
          ),
          selectCount: q.q.selectCount,
        };

  return {
    questionId,
    result,
    options,
    keyConcept: q.q.keyConcept,
    lesson: parsedLesson ? buildLessonView(parsedLesson, options) : null,
    tags: {
      scenario: q.scenario,
      domain: q.domain,
      primaryTask: { id: q.q.primaryTaskId, title: q.taskTitle },
      secondaryTasks: secondary,
      difficulty: q.q.difficulty,
    },
    links: {
      research: q.researchAnchor ? `/research#${q.researchAnchor}` : '/research',
      lesson: q.lessonUrl || null,
    },
  };
}
