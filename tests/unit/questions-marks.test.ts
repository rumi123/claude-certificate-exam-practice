import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { importContent } from '@/lib/content/import';
import { loadContent } from '@/lib/content/load';
import { closeDb, getDb } from '@/lib/db/client';
import { clearMarks, isMarked, searchQuestions } from '@/lib/db/queries/questions';
import { createSession, finishSession, getCandidates, setMarked } from '@/lib/db/queries/sessions';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccaf-marks-'));
  process.env.DATABASE_PATH = path.join(dir, 'test.db');
  importContent(getDb(), loadContent('tests/fixtures/content'));
});

afterEach(() => {
  closeDb();
  delete process.env.DATABASE_PATH;
  fs.rmSync(dir, { recursive: true, force: true });
});

const ids = () =>
  getCandidates({ scenarios: ['S1'] })
    .slice(0, 3)
    .map((c) => c.id);

function finishedSession(): string {
  const id = createSession({
    kind: 'practice',
    mode: 'test',
    filters: {},
    timeLimitS: null,
    items: ids().map((questionId, position) => ({
      questionId,
      position,
      optionOrder: ['a', 'b', 'c', 'd', 'e'],
    })),
  });
  finishSession(id, 'user');
  return id;
}

describe('marks across sessions', () => {
  it('filters the question list by marked', () => {
    const s = finishedSession();
    setMarked(s, 1, true);
    const res = searchQuestions({ marked: true, page: 1 });
    expect(res.total).toBe(1);
    expect(res.rows[0]).toMatchObject({ id: ids()[1], marked: true });
    expect(searchQuestions({ page: 1 }).rows.filter((r) => r.marked)).toHaveLength(1);
  });

  it('clearMarks unmarks the question in every session', () => {
    const a = finishedSession();
    const b = finishedSession();
    setMarked(a, 0, true);
    setMarked(b, 0, true);
    expect(isMarked(ids()[0])).toBe(true);
    expect(clearMarks(ids()[0])).toBe(2);
    expect(isMarked(ids()[0])).toBe(false);
    expect(searchQuestions({ marked: true, page: 1 }).total).toBe(0);
    expect(clearMarks(ids()[0])).toBe(0);
  });
});
