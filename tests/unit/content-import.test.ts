import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { importContent } from '@/lib/content/import';
import { loadContent, type RawContent } from '@/lib/content/load';
import type { QuestionFile } from '@/lib/content/schemas';
import { closeDb, getDb } from '@/lib/db/client';
import * as t from '@/lib/db/schema';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccaf-import-'));
  process.env.DATABASE_PATH = path.join(dir, 'test.db');
});

afterEach(() => {
  closeDb();
  delete process.env.DATABASE_PATH;
  fs.rmSync(dir, { recursive: true, force: true });
});

function raw(): RawContent {
  return structuredClone(loadContent('content'));
}

function firstFile(r: RawContent): QuestionFile {
  return r.questionFiles[0].data as QuestionFile;
}

describe('importContent', () => {
  it('inserts everything on the first import', () => {
    const res = importContent(getDb(), raw());
    expect(res).toMatchObject({ inserted: 150, updated: 0, unchanged: 0, retired: 0 });
    expect(res.cards).toEqual({ inserted: 120, updated: 0, unchanged: 0, retired: 0 });
    expect(getDb().select().from(t.questionOption).all()).toHaveLength(630);
  });

  it('reports everything unchanged on the second import', () => {
    importContent(getDb(), raw());
    const res = importContent(getDb(), raw());
    expect(res).toMatchObject({ inserted: 0, updated: 0, unchanged: 150, retired: 0 });
    expect(res.cards).toEqual({ inserted: 0, updated: 0, unchanged: 120, retired: 0 });
  });

  it('bumps the version of an edited question', () => {
    importContent(getDb(), raw());
    const r = raw();
    const q = firstFile(r).questions[0];
    q.stem = `${q.stem} Edited.`;
    const res = importContent(getDb(), r);
    expect(res).toMatchObject({ inserted: 0, updated: 1, unchanged: 149 });
    const row = getDb().select().from(t.question).where(eq(t.question.id, q.id)).get();
    expect(row?.version).toBe(2);
    expect(row?.stem).toContain('Edited.');
  });

  it('retires a removed question without deleting it', () => {
    importContent(getDb(), raw());
    const r = raw();
    const removed = firstFile(r).questions.pop()!;
    const res = importContent(getDb(), r);
    expect(res.retired).toBe(1);
    const row = getDb().select().from(t.question).where(eq(t.question.id, removed.id)).get();
    expect(row?.retired).toBe(1);
    const opts = getDb()
      .select()
      .from(t.questionOption)
      .where(eq(t.questionOption.questionId, removed.id))
      .all();
    expect(opts.length).toBeGreaterThan(0);
  });

  it('never touches progress tables', () => {
    importContent(getDb(), raw());
    const db = getDb();
    const qid = firstFile(raw()).questions[0].id;
    db.insert(t.session)
      .values({ id: 's-1', kind: 'practice', mode: 'study', filtersJson: '{}', startedAt: 1 })
      .run();
    db.insert(t.sessionItem)
      .values({ sessionId: 's-1', position: 0, questionId: qid, optionOrderJson: '[]' })
      .run();
    const edited = raw();
    firstFile(edited).questions[0].stem += ' Edited.';
    importContent(db, edited);
    const removed = raw();
    firstFile(removed).questions.shift();
    importContent(db, removed);
    expect(db.select().from(t.sessionItem).all()).toHaveLength(1);
    expect(db.select().from(t.session).all()).toHaveLength(1);
  });
});
