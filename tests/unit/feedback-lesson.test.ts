import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { importContent } from '@/lib/content/import';
import { loadContent } from '@/lib/content/load';
import type { Lesson, LessonFile } from '@/lib/content/schemas';
import { closeDb, getDb } from '@/lib/db/client';
import { getFeedback } from '@/lib/db/queries/sessions';
import { buildLessonView, optionStatus, type OptionStatus } from '@/lib/feedback';

const FIXTURES = 'tests/fixtures/content';
let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccaf-fb-lesson-'));
  process.env.DATABASE_PATH = path.join(dir, 'test.db');
});

afterEach(() => {
  closeDb();
  delete process.env.DATABASE_PATH;
  fs.rmSync(dir, { recursive: true, force: true });
});

const fixtureLesson = (id: string): Lesson =>
  (loadContent(FIXTURES).lessonFiles[0].data as LessonFile).lessons.find(
    (l) => l.questionId === id,
  )!;

describe('optionStatus', () => {
  const cases: [boolean, boolean, boolean, OptionStatus][] = [
    [true, true, true, 'chosen-correct'],
    [false, true, true, 'chosen-wrong'],
    [true, false, true, 'missed'],
    [false, false, true, 'not-chosen'],
    [true, false, false, 'correct'],
    [false, false, false, 'wrong'],
  ];
  it.each(cases)(
    'isCorrect %s, selected %s, answered %s -> %s',
    (isCorrect, selected, answered, want) => {
      expect(optionStatus({ isCorrect, selected }, answered)).toBe(want);
    },
  );
});

describe('buildLessonView', () => {
  it('maps eliminate options to display letters and sorts the rows', () => {
    const order = ['d', 'c', 'b', 'a'].map((key, i) => ({ key, letter: 'ABCD'[i] }));
    const view = buildLessonView(fixtureLesson('S1-002'), order);
    expect(view.eliminate.map((e) => [e.key, e.letter])).toEqual([
      ['d', 'A'],
      ['c', 'B'],
      ['b', 'C'],
    ]);
    expect('options' in view).toBe(false);
  });
});

describe('getFeedback with lessons', () => {
  it('returns the lesson and per-option reasoning, or nulls without one', () => {
    importContent(getDb(), structuredClone(loadContent(FIXTURES)));
    const fb = getFeedback('S1-002', ['d'], ['d', 'c', 'b', 'a']);
    expect(fb.lesson).not.toBeNull();
    expect(fb.lesson!.eliminate.map((e) => e.letter)).toEqual(['A', 'B', 'C']);
    expect(fb.options.find((o) => o.key === 'd')?.reasoning).toBe(
      fixtureLesson('S1-002').options.d!.reasoning,
    );
    expect(fb.options.find((o) => o.key === 'd')?.tempting).toBe(
      fixtureLesson('S1-002').options.d!.tempting,
    );

    const none = getFeedback('S1-001', [], ['a', 'b', 'c', 'd']);
    expect(none.lesson).toBeNull();
    expect(none.options.every((o) => o.reasoning === null && o.tempting === null)).toBe(true);
  });
});
