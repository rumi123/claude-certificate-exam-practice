import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { importContent } from '@/lib/content/import';
import { loadContent, type RawContent } from '@/lib/content/load';
import { lessonGaps } from '@/lib/content/quality';
import { LessonSchema, type Lesson, type LessonFile } from '@/lib/content/schemas';
import { validateContent } from '@/lib/content/validate';
import { closeDb, getDb } from '@/lib/db/client';

const FIXTURES = 'tests/fixtures/content';
let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccaf-lesson-'));
  process.env.DATABASE_PATH = path.join(dir, 'test.db');
});

afterEach(() => {
  closeDb();
  delete process.env.DATABASE_PATH;
  fs.rmSync(dir, { recursive: true, force: true });
});

const raw = (): RawContent => structuredClone(loadContent(FIXTURES));
const file = (r: RawContent): LessonFile => r.lessonFiles[0].data as LessonFile;
const lesson = (r: RawContent, id: string): Lesson =>
  file(r).lessons.find((l) => l.questionId === id)!;

function rowCount(): number {
  return getDb().all<{ n: number }>(sql`select count(*) as n from question_lesson`)[0].n;
}

describe('loading', () => {
  it('reads lessons/*.json and returns none when the folder is missing', () => {
    expect(loadContent(FIXTURES).lessonFiles.map((f) => f.file)).toEqual(['lessons/d1.json']);
    const copy = path.join(dir, 'content');
    fs.cpSync(FIXTURES, copy, { recursive: true });
    fs.rmSync(path.join(copy, 'lessons'), { recursive: true });
    expect(loadContent(copy).lessonFiles).toEqual([]);
  });
});

describe('lesson question ids', () => {
  // Fixture ids are short (S1-002); the aicert bank uses S3-D1-001. Both must parse.
  it.each(['S1-002', 'S3-D1-001', 'M1-S1-001'])('accepts %s', (id) => {
    const r = raw();
    const l = { ...structuredClone(lesson(r, 'S1-002')), questionId: id };
    expect(LessonSchema.safeParse(l).success).toBe(true);
  });
  it.each(['S7-D1-001', 'S3-D6-001', 'S3-D1-01'])('rejects %s', (id) => {
    const r = raw();
    const l = { ...structuredClone(lesson(r, 'S1-002')), questionId: id };
    expect(LessonSchema.safeParse(l).success).toBe(false);
  });
});

describe('validating lessons', () => {
  const errorsOf = (r: RawContent) => validateContent(r).errors;
  const expectError = (r: RawContent, id: string, fragment: string) => {
    const hit = errorsOf(r).filter((e) => e.message.includes(fragment));
    expect(hit.length).toBeGreaterThan(0);
    expect(hit.every((e) => e.id === id)).toBe(true);
  };

  it('accepts the fixture lessons', () => {
    expect(errorsOf(raw())).toEqual([]);
  });

  it('rejects an unknown question id', () => {
    const r = raw();
    lesson(r, 'S1-002').questionId = 'S1-099';
    expectError(r, 'S1-099', 'not in the question or mock files');
  });

  it('rejects a question from another domain', () => {
    const r = raw();
    file(r).domain = 'D2';
    // The whole file moves to D2, so every lesson in it is reported.
    const ids = errorsOf(r)
      .filter((e) => e.message.includes('question is in D1, file is D2'))
      .map((e) => e.id);
    expect(ids).toEqual(['S1-002', 'S1-003']);
  });

  it('rejects a second lesson for one question, across files', () => {
    const r = raw();
    r.lessonFiles.push({
      file: 'lessons/d1b.json',
      data: { domain: 'D1', lessons: [structuredClone(lesson(r, 'S1-002'))] },
    });
    expectError(r, 'S1-002', 'second lesson');
  });

  it('rejects a missing and an extra option entry', () => {
    const r = raw();
    delete (lesson(r, 'S1-002').options as Record<string, unknown>).c;
    expectError(r, 'S1-002', 'missing c');
    const r2 = raw();
    lesson(r2, 'S1-002').options.e = { ...lesson(r2, 'S1-002').options.a! };
    expectError(r2, 'S1-002', 'extra e');
  });

  it('rejects eliminate naming a correct option', () => {
    const r = raw();
    lesson(r, 'S1-002').eliminate.push({ option: 'a', reason: 'This one is actually the right answer.' });
    expectError(r, 'S1-002', 'names correct option a');
  });

  it('rejects eliminate leaving out a wrong option', () => {
    const r = raw();
    lesson(r, 'S1-002').eliminate.pop();
    expectError(r, 'S1-002', 'leaves out wrong option');
  });

  it('rejects a letter reference', () => {
    const r = raw();
    lesson(r, 'S1-002').rule = 'Never choose option B when the stem names a cause.';
    expectError(r, 'S1-002', 'option letter');
  });

  it('rejects lessons with no exam-guide or docs source', () => {
    const r = raw();
    for (const s of lesson(r, 'S1-003').sources) s.kind = 'skilljar';
    expectError(r, 'S1-003', 'exam-guide or anthropic-docs');
  });

  it('rejects a lesson source that is not an Anthropic page', () => {
    const r = raw();
    lesson(r, 'S1-003').sources[0].url = 'https://dev.to/x/post';
    expectError(r, 'S1-003', 'not an Anthropic page');
  });

  it('rejects a date that is not on the calendar', () => {
    const r = raw();
    lesson(r, 'S1-003').verifiedAt = '2026-02-30';
    expectError(r, 'S1-003', 'not a real date');
  });

  it('names the question for a schema error', () => {
    const r = raw();
    lesson(r, 'S1-003').rule = 'short';
    const hit = errorsOf(r).filter((e) => e.message.startsWith('lessons.1.rule'));
    expect(hit.map((e) => e.id)).toEqual(['S1-003']);
  });
});

describe('importing lessons', () => {
  it('inserts, then leaves unchanged on re-import', () => {
    const res = importContent(getDb(), raw());
    expect(res.lessons).toEqual({ inserted: 2, updated: 0, unchanged: 0, retired: 0 });
    expect(importContent(getDb(), raw()).lessons).toEqual({
      inserted: 0,
      updated: 0,
      unchanged: 2,
      retired: 0,
    });
    expect(rowCount()).toBe(2);
  });

  it('updates a changed lesson', () => {
    importContent(getDb(), raw());
    const r = raw();
    lesson(r, 'S1-002').rule = 'A different rule to remember, long enough to pass.';
    expect(importContent(getDb(), r).lessons).toEqual({
      inserted: 0,
      updated: 1,
      unchanged: 1,
      retired: 0,
    });
  });

  it('deletes the row of a removed lesson', () => {
    importContent(getDb(), raw());
    const r = raw();
    file(r).lessons.pop();
    expect(importContent(getDb(), r).lessons.retired).toBe(1);
    expect(rowCount()).toBe(1);
  });

  it('deletes every row when the folder is missing', () => {
    importContent(getDb(), raw());
    const r = raw();
    r.lessonFiles = [];
    expect(importContent(getDb(), r).lessons.retired).toBe(2);
    expect(rowCount()).toBe(0);
  });

  it('throws naming the id when the question is not imported', () => {
    const r = raw();
    lesson(r, 'S1-002').questionId = 'S1-099';
    expect(() => importContent(getDb(), r)).toThrow('S1-099');
  });
});

describe('lessons for mock questions', () => {
  const mockPaper = (r: RawContent) => r.mockFiles[0].data as { status?: 'draft' | 'ready' };
  const withMockLesson = (r: RawContent, id = 'M1-S1-001') => {
    const l = structuredClone(lesson(r, 'S1-002'));
    l.questionId = id;
    file(r).lessons.push(l);
  };
  const lessonRows = (id: string) =>
    getDb().all<{ n: number }>(sql`select count(*) as n from question_lesson where question_id = ${id}`)[0].n;

  it('accepts a lesson in the domain file of the question and imports it', () => {
    const r = raw();
    withMockLesson(r);
    expect(validateContent(r).errors).toEqual([]);
    importContent(getDb(), r);
    expect(lessonRows('M1-S1-001')).toBe(1);
  });

  it('rejects the lesson in another domain file and an unknown mock id', () => {
    const r = raw();
    withMockLesson(r);
    file(r).domain = 'D2';
    const hit = validateContent(r).errors.filter((e) => e.id === 'M1-S1-001');
    expect(hit.some((e) => e.message.includes('question is in D1, file is D2'))).toBe(true);
    const r2 = raw();
    withMockLesson(r2, 'M9-S1-001');
    const hit2 = validateContent(r2).errors.filter((e) => e.id === 'M9-S1-001');
    expect(
      hit2.some((e) => e.message.includes('lesson is for a question that is not in the question or mock files')),
    ).toBe(true);
  });

  it('skips lessons of a draft paper without throwing', () => {
    const r = raw();
    withMockLesson(r);
    mockPaper(r).status = 'draft';
    expect(() => importContent(getDb(), r)).not.toThrow();
    expect(lessonRows('M1-S1-001')).toBe(0);
    expect(rowCount()).toBe(2);
  });
});

describe('lessonGaps', () => {
  it('counts questions without a lesson per domain', () => {
    const qs = [
      { id: 'S1-001', domain: 'D1' },
      { id: 'S1-002', domain: 'D1' },
      { id: 'S1-003', domain: 'D1' },
    ];
    expect(lessonGaps(qs, new Set(['S1-002', 'S1-003']))).toEqual({ D1: { total: 3, missing: 1 } });
  });
});
