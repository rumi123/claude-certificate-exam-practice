import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { importContent } from '@/lib/content/import';
import { loadContent } from '@/lib/content/load';
import { closeDb, getDb } from '@/lib/db/client';
import { getSessionHistory, sourceLabel, type SourceNames } from '@/lib/db/queries/history';
import { createSession, getCandidates, setMarked } from '@/lib/db/queries/sessions';
import * as t from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccaf-history-'));
  process.env.DATABASE_PATH = path.join(dir, 'test.db');
  importContent(getDb(), loadContent('tests/fixtures/content'));
});

afterEach(() => {
  closeDb();
  delete process.env.DATABASE_PATH;
  fs.rmSync(dir, { recursive: true, force: true });
});

const qids = () =>
  getCandidates({ scenarios: ['S1'] })
    .slice(0, 3)
    .map((c) => c.id);

function make(mode: 'study' | 'test', status: string, finishedAt: number | null): string {
  const id = createSession({
    kind: 'practice',
    mode,
    filters: {},
    timeLimitS: null,
    items: qids().map((questionId, position) => ({
      questionId,
      position,
      optionOrder: ['a', 'b', 'c', 'd', 'e'],
    })),
  });
  getDb()
    .update(t.session)
    .set({ status, finishedAt, startedAt: (finishedAt ?? 100_000) - 60_000 })
    .where(eq(t.session.id, id))
    .run();
  return id;
}

describe('getSessionHistory', () => {
  it('excludes in-progress, includes abandoned, newest first', () => {
    make('test', 'in_progress', null);
    const older = make('study', 'completed', 1_000_000);
    const newer = make('test', 'abandoned', 2_000_000);
    const rows = getSessionHistory();
    expect(rows.map((r) => r.id)).toEqual([newer, older]);
    expect(rows[0].status).toBe('abandoned');
    expect(rows[0].timeUsedMs).toBe(60_000);
  });

  it('filters by mode', () => {
    make('study', 'completed', 1_000_000);
    const test = make('test', 'completed', 2_000_000);
    expect(getSessionHistory('test').map((r) => r.id)).toEqual([test]);
    expect(getSessionHistory('study')).toHaveLength(1);
  });

  it('counts total, answered, correct and marked', () => {
    const id = make('test', 'completed', 1_000_000);
    const db = getDb();
    db.update(t.sessionItem)
      .set({ answeredAt: 1, selectedJson: '["a"]', isCorrect: 1 })
      .where(eq(t.sessionItem.sessionId, id))
      .run();
    db.update(t.sessionItem)
      .set({ answeredAt: null, selectedJson: null, isCorrect: 0 })
      .where(eq(t.sessionItem.position, 2))
      .run();
    setMarked(id, 1, true);
    const [row] = getSessionHistory();
    expect(row).toMatchObject({ total: 3, answered: 2, correct: 2, marked: 1 });
  });
});

describe('sourceLabel', () => {
  const names: SourceNames = { domains: { D1: 'Agentic Architecture' }, scenarios: {} };
  const label = (f: unknown, kind = 'practice') => sourceLabel(kind, JSON.stringify(f), names);

  it('labels each source', () => {
    expect(label({ source: 'mock', ids: ['mock-2'] })).toBe('Mock 2');
    expect(label({ source: 'mistakes' })).toBe('Mistakes review');
    expect(label({ source: 'review' }, 'review')).toBe('Review');
    expect(label({ source: 'task', ids: ['1.2'], drill: true })).toBe('Task 1.2 drill');
    expect(label({ source: 'task', ids: ['1.2', '1.3'] })).toBe('Task 1.2, 1.3');
    expect(label({ source: 'domain', ids: ['D1'] })).toBe('Agentic Architecture');
    expect(label({ source: 'preset', ids: ['d1'] })).toBe('D1 Deep Drill');
    expect(label({ source: 'all' })).toBe('All questions');
  });

  it('falls back to Practice', () => {
    expect(label({})).toBe('Practice');
    expect(sourceLabel('practice', 'not json', names)).toBe('Practice');
  });
});
