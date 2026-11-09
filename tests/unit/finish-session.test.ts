import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setClockOffsetProvider } from '@/lib/clock';
import { importContent } from '@/lib/content/import';
import { loadContent } from '@/lib/content/load';
import { closeDb, getDb } from '@/lib/db/client';
import {
  abandonSession,
  createMistakesSession,
  createSession,
  finishIfExpired,
  finishSession,
  getCandidates,
  getSummary,
  recordAnswer,
  setMarked,
} from '@/lib/db/queries/sessions';
import * as t from '@/lib/db/schema';
import type { Confidence, Mode } from '@/lib/types';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccaf-finish-'));
  process.env.DATABASE_PATH = path.join(dir, 'test.db');
  importContent(getDb(), loadContent('tests/fixtures/content'));
});

afterEach(() => {
  setClockOffsetProvider(() => 0);
  closeDb();
  delete process.env.DATABASE_PATH;
  fs.rmSync(dir, { recursive: true, force: true });
});

const ids = () =>
  getCandidates({ scenarios: ['S1'] })
    .slice(0, 5)
    .map((c) => c.id);

function start(mode: Mode, timeLimitS: number | null = null): string {
  return createSession({
    kind: 'practice',
    mode,
    filters: {},
    timeLimitS,
    items: ids().map((questionId, position) => ({
      questionId,
      position,
      optionOrder: ['a', 'b', 'c', 'd', 'e'],
    })),
  });
}

function options(questionId: string): { right: string[]; wrong: string[] } {
  const rows = getDb()
    .select()
    .from(t.questionOption)
    .where(eq(t.questionOption.questionId, questionId))
    .all();
  return {
    right: rows.filter((o) => o.isCorrect === 1).map((o) => o.key),
    wrong: rows.filter((o) => o.isCorrect === 0).map((o) => o.key),
  };
}

// Picks the right keys, or the wrong ones when `right` is false.
function answer(
  sessionId: string,
  position: number,
  right: boolean,
  confidence: Confidence = 'sure',
) {
  const { right: ok, wrong } = options(ids()[position]);
  return recordAnswer({
    sessionId,
    position,
    selected: right ? ok : wrong.slice(0, ok.length),
    confidence,
    timeMs: 1000,
  });
}

const items = (sessionId: string) =>
  getDb()
    .select()
    .from(t.sessionItem)
    .where(eq(t.sessionItem.sessionId, sessionId))
    .orderBy(t.sessionItem.position)
    .all();
const status = (sessionId: string) =>
  getDb().select().from(t.session).where(eq(t.session.id, sessionId)).get()!;
const reviews = () => getDb().select().from(t.reviewItem).all();

describe('finishSession', () => {
  it('test mode: unanswered items become wrong answers', () => {
    const id = start('test');
    answer(id, 0, true);
    answer(id, 1, true);
    finishSession(id, 'user');
    const rows = items(id);
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.answeredAt !== null)).toBe(true);
    const blank = rows.slice(2);
    expect(blank.map((r) => r.selectedJson)).toEqual(['[]', '[]', '[]']);
    expect(blank.every((r) => r.isCorrect === 0 && r.correctSelected === 0)).toBe(true);
    expect(blank.every((r) => r.confidence === null && r.reviewEffect === 'entered')).toBe(true);
    expect(status(id)).toMatchObject({ status: 'completed' });
    expect(status(id).finishedAt).not.toBeNull();
    expect(reviews()).toHaveLength(3);
  });

  it('study mode, user finish: unanswered items are deleted', () => {
    const id = start('study');
    answer(id, 0, true);
    answer(id, 1, true);
    finishSession(id, 'user');
    expect(items(id)).toHaveLength(2);
    expect(status(id).status).toBe('completed');
  });

  it('study mode, timer finish: unanswered items count as wrong', () => {
    const id = start('study');
    answer(id, 0, true);
    finishSession(id, 'timer');
    const rows = items(id);
    expect(rows).toHaveLength(5);
    expect(rows.slice(1).every((r) => r.selectedJson === '[]' && r.isCorrect === 0)).toBe(true);
    expect(reviews()).toHaveLength(4);
  });

  it('does nothing for a finished session', () => {
    const id = start('test');
    finishSession(id, 'user');
    const at = status(id).finishedAt;
    finishSession(id, 'user');
    expect(status(id).finishedAt).toBe(at);
  });
});

describe('test mode answers', () => {
  it('can be changed, and the Leitner update runs once at finish', () => {
    const id = start('test');
    answer(id, 0, false);
    answer(id, 0, true);
    answer(id, 0, false);
    expect(reviews()).toHaveLength(0);
    expect(items(id)[0].reviewEffect).toBeNull();
    finishSession(id, 'user');
    expect(items(id)[0]).toMatchObject({ isCorrect: 0, reviewEffect: 'entered' });
    const row = reviews().find((r) => r.questionId === ids()[0])!;
    expect(row).toMatchObject({ box: 1, lapses: 0 });
  });

  it('does not complete the session when every item is answered', () => {
    const id = start('test');
    for (let p = 0; p < 5; p++) answer(id, p, true);
    expect(status(id).status).toBe('in_progress');
  });

  it('study mode still rejects a second answer', () => {
    const id = start('study');
    answer(id, 0, true);
    expect(() => answer(id, 0, true)).toThrow(/already answered/);
  });
});

describe('abandonSession', () => {
  it('keeps only the answered rows', () => {
    const id = start('test');
    answer(id, 0, false);
    answer(id, 3, true);
    abandonSession(id);
    expect(items(id).map((r) => r.position)).toEqual([0, 3]);
    expect(status(id).status).toBe('abandoned');
    expect(items(id)[0].reviewEffect).toBe('entered');
    expect(reviews()).toHaveLength(1);
  });
});

describe('deadline', () => {
  it('finishes the session when an answer arrives after it', () => {
    const id = start('test', 60);
    answer(id, 0, true);
    setClockOffsetProvider(() => 61_000);
    const res = answer(id, 1, true);
    expect(res.expired).toBe(true);
    expect(status(id).status).toBe('completed');
    const rows = items(id);
    expect(rows[0].isCorrect).toBe(1);
    expect(rows[1]).toMatchObject({ selectedJson: '[]', isCorrect: 0 });
  });

  it('finishIfExpired only acts after the deadline', () => {
    const id = start('test', 60);
    expect(finishIfExpired(id)).toBe(false);
    setClockOffsetProvider(() => 61_000);
    expect(finishIfExpired(id)).toBe(true);
    expect(finishIfExpired(id)).toBe(false);
    expect(finishIfExpired('missing')).toBe(false);
  });
});

describe('setMarked', () => {
  it('stores the mark and rejects an unknown position', () => {
    const id = start('test');
    setMarked(id, 2, true);
    expect(items(id)[2].marked).toBe(1);
    setMarked(id, 2, false);
    expect(items(id)[2].marked).toBe(0);
    expect(() => setMarked(id, 9, true)).toThrow();
  });
});

describe('getSummary and createMistakesSession', () => {
  it('is hidden while the session is in progress', () => {
    const id = start('test');
    answer(id, 0, true);
    expect(getSummary(id)).toBeNull();
  });

  it('counts score, calibration and review entries', () => {
    const id = start('test');
    answer(id, 0, true);
    answer(id, 1, false);
    answer(id, 2, true, 'guess');
    finishSession(id, 'user');
    const s = getSummary(id)!;
    expect(s).toMatchObject({ total: 5, answered: 3, correct: 2 });
    expect(s.calibration).toEqual({ blindSpots: 1, luckyGuesses: 1, unsure: 0 });
    expect(s.reviewEntered).toBe(4); // 1 wrong + 1 lucky guess + 2 blanks
    expect(s.byDomain.reduce((n, r) => n + r.answered, 0)).toBe(3);
    expect(s.byTask.reduce((n, r) => n + r.correct, 0)).toBe(2);
  });

  it('starts a study session of the wrong items', () => {
    const id = start('test');
    answer(id, 0, true);
    answer(id, 1, false);
    finishSession(id, 'user');
    const next = createMistakesSession(id);
    const rows = items(next);
    expect(rows.map((r) => r.questionId)).toEqual(ids().slice(1));
    expect(status(next)).toMatchObject({ mode: 'study', status: 'in_progress' });
    const clean = start('test');
    for (let p = 0; p < 5; p++) answer(clean, p, true);
    finishSession(clean, 'user');
    expect(() => createMistakesSession(clean)).toThrow();
  });
});
