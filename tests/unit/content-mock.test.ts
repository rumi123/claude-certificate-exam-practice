import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { importContent } from '@/lib/content/import';
import { loadContent, type RawContent } from '@/lib/content/load';
import type { MockFile } from '@/lib/content/schemas';
import { validateContent } from '@/lib/content/validate';
import { closeDb, getDb } from '@/lib/db/client';
import { getCandidates, getMockPools } from '@/lib/db/queries/sessions';
import { SetupInputSchema } from '@/lib/engine/setup-schema';

const FIXTURES = 'tests/fixtures/content';
let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccaf-mock-'));
  process.env.DATABASE_PATH = path.join(dir, 'test.db');
});

afterEach(() => {
  closeDb();
  delete process.env.DATABASE_PATH;
  fs.rmSync(dir, { recursive: true, force: true });
});

const raw = (): RawContent => structuredClone(loadContent(FIXTURES));
const paper = (r: RawContent): MockFile => r.mockFiles[0].data as MockFile;

function poolCounts(): Record<string, number> {
  const rows = getDb().all<{ pool: string; n: number }>(
    sql`select pool, count(*) as n from question where retired = 0 group by pool`,
  );
  return Object.fromEntries(rows.map((r) => [r.pool, r.n]));
}

describe('loading', () => {
  it('reads mocks/*.json and returns none when the folder is missing', () => {
    expect(loadContent(FIXTURES).mockFiles.map((f) => f.file)).toEqual(['mocks/mock-1.json']);
    const copy = path.join(dir, 'content');
    fs.cpSync(FIXTURES, copy, { recursive: true });
    fs.rmSync(path.join(copy, 'mocks'), { recursive: true });
    expect(loadContent(copy).mockFiles).toEqual([]);
  });
});

describe('importing a paper', () => {
  it('imports into its own pool and leaves practice counts alone', () => {
    const res = importContent(getDb(), raw());
    expect(res).toMatchObject({ inserted: 50, updated: 0, unchanged: 0, retired: 0 });
    expect(res.mocks).toEqual({ inserted: 15, updated: 0, unchanged: 0, retired: 0 });
    expect(poolCounts()).toEqual({ practice: 50, 'mock-1': 15 });
    const scenarios = getDb().all<{ scenario_id: string }>(
      sql`select distinct scenario_id from question where pool = 'mock-1' order by 1`,
    );
    expect(scenarios.map((r) => r.scenario_id)).toEqual(['S1', 'S2']);
  });

  it('reports everything unchanged on re-import', () => {
    importContent(getDb(), raw());
    const res = importContent(getDb(), raw());
    expect(res.mocks).toEqual({ inserted: 0, updated: 0, unchanged: 15, retired: 0 });
    expect(res).toMatchObject({ inserted: 0, updated: 0, unchanged: 50 });
  });

  it('retires a removed question in its pool only', () => {
    importContent(getDb(), raw());
    const r = raw();
    const removed = paper(r).questions.pop()!;
    const res = importContent(getDb(), r);
    expect(res.mocks.retired).toBe(1);
    expect(res.retired).toBe(0);
    expect(poolCounts()).toEqual({ practice: 50, 'mock-1': 14 });
    const row = getDb().all<{ retired: number }>(
      sql`select retired from question where id = ${removed.id}`,
    );
    expect(row[0].retired).toBe(1);
  });

  it('retires a whole paper when its file is gone', () => {
    importContent(getDb(), raw());
    const r = raw();
    r.mockFiles = [];
    const res = importContent(getDb(), r);
    expect(res.mocks.retired).toBe(15);
    expect(poolCounts()).toEqual({ practice: 50 });
    expect(getMockPools()).toEqual([]);
  });

  it('serves each pool through getCandidates', () => {
    importContent(getDb(), raw());
    expect(getCandidates()).toHaveLength(50);
    const mock = getCandidates({}, 'mock-1');
    expect(mock).toHaveLength(15);
    expect(mock.every((c) => c.id.startsWith('M1-'))).toBe(true);
    expect(getCandidates({ scenarios: ['S2'] }, 'mock-1').length).toBe(7);
    expect(getMockPools()).toEqual(['mock-1']);
  });
});

describe('setup schema', () => {
  it('accepts the mock source with a size up to the paper size', () => {
    const base = {
      source: 'mock',
      ids: ['mock-1'],
      size: 60,
      mode: 'test',
      timer: false,
      order: 'mixed',
      prefer: 'unseen',
      multi: 'yes',
    };
    expect(SetupInputSchema.safeParse(base).success).toBe(true);
  });
});

describe('validating papers', () => {
  const errorsOf = (r: RawContent) => validateContent(r).errors.map((e) => e.message);
  const warningsOf = (r: RawContent) => validateContent(r).warnings.map((e) => e.message);
  const expectError = (r: RawContent, fragment: string) =>
    expect(errorsOf(r).some((m) => m.includes(fragment))).toBe(true);

  it('accepts a valid paper; size and mix problems are warnings only', () => {
    const r = raw();
    const res = validateContent(r);
    expect(res.errors).toEqual([]);
    expect(res.coverage.questions).toBe(50);
    const w = warningsOf(r);
    expect(w).toContain('has 15 questions (expected 60)');
    expect(w).toContain('scenario S1 has 8 questions (expected 15)');
    expect(w).toContain('has 4 multi questions (expected 12)');
    expect(w.some((m) => m.startsWith('domain D1 has'))).toBe(true);
    expect(w.some((m) => m.startsWith('difficulty 2 has'))).toBe(true);
    expect(w.some((m) => m.includes('(expected 25)'))).toBe(false);
  });

  it('rejects a malformed id', () => {
    const r = raw();
    paper(r).questions[0].id = 'S1-001';
    expectError(r, 'id must look like');
  });

  it('rejects an id whose paper number does not match the pool', () => {
    const r = raw();
    paper(r).questions[0].id = 'M2-S1-001';
    expectError(r, 'paper number does not match pool');
  });

  it('rejects an id whose scenario does not match the question', () => {
    const r = raw();
    paper(r).questions[0].id = 'M1-S2-001';
    expectError(r, 'id scenario S2 does not match scenario S1');
  });

  it('rejects a scenario that the file does not list', () => {
    const r = raw();
    paper(r).scenarios = ['S2', 'S3', 'S4', 'S5'];
    expectError(r, 'not listed in the file');
  });

  it('rejects a bad pool and a wrong scenario count', () => {
    const r = raw();
    paper(r).pool = 'paper-1';
    expectError(r, 'pool');
    const r2 = raw();
    paper(r2).scenarios = ['S1', 'S2', 'S3'];
    expectError(r2, 'scenarios');
  });

  it('rejects an id or stem that duplicates the practice bank', () => {
    const r = raw();
    const practice = (r.questionFiles[0].data as { questions: { id: string; stem: string }[] })
      .questions[0];
    paper(r).questions[0].id = practice.id;
    expectError(r, 'duplicate id');
    const r2 = raw();
    paper(r2).questions[1].stem = practice.stem;
    expectError(r2, 'stem duplicates');
  });

  it('rejects more than 4 beyondGuide questions', () => {
    const r = raw();
    paper(r)
      .questions.slice(0, 5)
      .forEach((q) => (q.beyondGuide = true));
    expect(errorsOf(r)).toEqual([expect.stringContaining('more than 4 beyondGuide')]);
    const ok = raw();
    paper(ok)
      .questions.slice(0, 4)
      .forEach((q) => (q.beyondGuide = true));
    expect(errorsOf(ok)).toEqual([]);
  });

  it('rejects more than 4 NONEXISTENT_FEATURE wrong options in a paper', () => {
    const mark = (n: number) => {
      const r = raw();
      for (const o of paper(r).questions.flatMap((q) => q.options)) {
        if (o.trap === 'NONEXISTENT_FEATURE') o.trap = 'SYMPTOM_PATCH';
      }
      for (const q of paper(r).questions.slice(0, n)) {
        q.options.find((o) => !o.correct)!.trap = 'NONEXISTENT_FEATURE';
      }
      return r;
    };
    expectError(mark(5), '5 NONEXISTENT_FEATURE wrong options');
    expect(errorsOf(mark(4))).toEqual([]);
  });

  it('applies the per-question rules to paper questions', () => {
    const r = raw();
    paper(r).questions[0].options.pop();
    expectError(r, 'needs 4 options');
  });
});
