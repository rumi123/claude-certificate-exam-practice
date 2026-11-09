import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { importContent } from '@/lib/content/import';
import { loadContent } from '@/lib/content/load';
import { closeDb, getDb } from '@/lib/db/client';
import {
  createSession,
  getCandidates,
  getFeedback,
  getSessionView,
  recordAnswer,
} from '@/lib/db/queries/sessions';
import * as t from '@/lib/db/schema';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccaf-answer-'));
  process.env.DATABASE_PATH = path.join(dir, 'test.db');
  importContent(getDb(), loadContent('tests/fixtures/content'));
});

afterEach(() => {
  closeDb();
  delete process.env.DATABASE_PATH;
  fs.rmSync(dir, { recursive: true, force: true });
});

// S1-001 is single (a is correct); S1-003 is multi (a and b are correct).
function start(ids: string[] = ['S1-001', 'S1-003']): string {
  return createSession({
    kind: 'practice',
    mode: 'study',
    filters: {},
    timeLimitS: null,
    items: ids.map((questionId, position) => ({
      questionId,
      position,
      optionOrder: ['a', 'b', 'c', 'd', 'e'].filter((k) => k !== 'e' || questionId !== 'S1-001'),
    })),
  });
}

const item = (sessionId: string, position: number) =>
  getDb()
    .select()
    .from(t.sessionItem)
    .all()
    .find((i) => i.sessionId === sessionId && i.position === position)!;

describe('recordAnswer', () => {
  it('stores the score and creates no review item for a correct Sure answer', () => {
    const id = start();
    const res = recordAnswer({
      sessionId: id,
      position: 0,
      selected: ['a'],
      confidence: 'sure',
      timeMs: 1234,
    });
    expect(res).toMatchObject({ isCorrect: true, correctSelected: 1, completed: false });
    expect(item(id, 0)).toMatchObject({
      isCorrect: 1,
      correctSelected: 1,
      confidence: 'sure',
      timeMs: 1234,
      reviewEffect: 'none',
      selectedJson: '["a"]',
    });
    expect(item(id, 0).answeredAt).not.toBeNull();
    expect(getDb().select().from(t.reviewItem).all()).toHaveLength(0);
  });

  it('creates a review item on a wrong answer', () => {
    const id = start();
    recordAnswer({ sessionId: id, position: 0, selected: ['b'], confidence: 'sure', timeMs: 1 });
    expect(item(id, 0)).toMatchObject({
      isCorrect: 0,
      correctSelected: 0,
      reviewEffect: 'entered',
    });
    const row = getDb().select().from(t.reviewItem).all();
    expect(row).toHaveLength(1);
    expect(row[0]).toMatchObject({ questionId: 'S1-001', box: 1, lapses: 0 });
  });

  it('stores partial credit for a multiple-response question', () => {
    const id = start();
    recordAnswer({
      sessionId: id,
      position: 1,
      selected: ['a', 'c'],
      confidence: 'sure',
      timeMs: 1,
    });
    expect(item(id, 1)).toMatchObject({ isCorrect: 0, correctSelected: 1 });
  });

  it('completes the session when the last item is answered', () => {
    const id = start();
    recordAnswer({ sessionId: id, position: 0, selected: ['a'], confidence: 'sure', timeMs: 1 });
    const last = recordAnswer({
      sessionId: id,
      position: 1,
      selected: ['a', 'b'],
      confidence: 'sure',
      timeMs: 1,
    });
    expect(last.completed).toBe(true);
    const s = getDb().select().from(t.session).where(eq(t.session.id, id)).get();
    expect(s?.status).toBe('completed');
    expect(s?.finishedAt).not.toBeNull();
  });

  describe('rejects', () => {
    const base = { confidence: 'sure', timeMs: 1 } as const;

    it('an already answered position', () => {
      const id = start();
      recordAnswer({ sessionId: id, position: 0, selected: ['a'], ...base });
      expect(() => recordAnswer({ sessionId: id, position: 0, selected: ['a'], ...base })).toThrow(
        /already answered/,
      );
    });

    it('a finished session', () => {
      const id = start(['S1-001']);
      recordAnswer({ sessionId: id, position: 0, selected: ['a'], ...base });
      expect(() => recordAnswer({ sessionId: id, position: 0, selected: ['a'], ...base })).toThrow(
        /finished/,
      );
    });

    it('the wrong number of selections', () => {
      const id = start();
      expect(() =>
        recordAnswer({ sessionId: id, position: 0, selected: ['a', 'b'], ...base }),
      ).toThrow();
      expect(() =>
        recordAnswer({ sessionId: id, position: 1, selected: ['a'], ...base }),
      ).toThrow();
      expect(() =>
        recordAnswer({ sessionId: id, position: 1, selected: ['a', 'a'], ...base }),
      ).toThrow();
    });

    it('a key that is not in the question', () => {
      const id = start();
      expect(() => recordAnswer({ sessionId: id, position: 0, selected: ['z'], ...base })).toThrow(
        /Unknown option/,
      );
    });

    it('leaves the item unanswered after a rejection', () => {
      const id = start();
      expect(() =>
        recordAnswer({ sessionId: id, position: 0, selected: ['z'], ...base }),
      ).toThrow();
      expect(item(id, 0).answeredAt).toBeNull();
    });
  });
});

describe('getCandidates', () => {
  it('filters by scenario and by primary task', () => {
    const all = getCandidates();
    expect(all).toHaveLength(50);
    expect(getCandidates({ scenarios: ['S1'] })).toHaveLength(25);
    expect(getCandidates({ scenarios: [] })).toHaveLength(0);
    const task = all.find((c) => c.id === 'S1-001')!.primaryTaskId;
    expect(getCandidates({ tasks: [task] }).every((c) => c.primaryTaskId === task)).toBe(true);
  });

  it('reports when a question was last answered', () => {
    const id = start(['S1-001']);
    recordAnswer({ sessionId: id, position: 0, selected: ['a'], confidence: 'sure', timeMs: 1 });
    const seen = getCandidates({ scenarios: ['S1'] }).filter((c) => c.lastSeenAt !== null);
    expect(seen.map((c) => c.id)).toEqual(['S1-001']);
  });
});

describe('getSessionView and getFeedback', () => {
  it('lists options in display order without correctness', () => {
    const id = start();
    const view = getSessionView(id)!;
    expect(view.items).toHaveLength(2);
    expect(view.items[0].scenario.name).toBe('Customer Support Resolution Agent');
    expect(view.items[0].options.map((o) => o.letter)).toEqual(['A', 'B', 'C', 'D']);
    expect(JSON.stringify(view)).not.toContain('explanation');
    expect(view.items[0].answered).toBe(false);
  });

  it('marks the options and links the research section', () => {
    const fb = getFeedback('S1-001', ['b'], ['c', 'b', 'a', 'd']);
    expect(fb.result).toEqual({ isCorrect: false, correctSelected: 0, selectCount: 1 });
    expect(fb.options.map((o) => o.letter)).toEqual(['A', 'B', 'C', 'D']);
    expect(fb.options.map((o) => o.key)).toEqual(['c', 'b', 'a', 'd']);
    expect(fb.options.find((o) => o.key === 'b')).toMatchObject({
      selected: true,
      isCorrect: false,
      trap: { id: 'PROMPT_FOR_GUARANTEE' },
    });
    expect(fb.options.find((o) => o.key === 'a')?.isCorrect).toBe(true);
    expect(fb.links.research).toMatch(/^\/research#task-\d-\d$/);
  });
});
