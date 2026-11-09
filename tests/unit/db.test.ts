import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { now, setClockOffsetProvider } from '@/lib/clock';
import { closeDb, getDb } from '@/lib/db/client';
import { getSetting, setSetting } from '@/lib/db/settings';

const TABLES = [
  'content_meta',
  'domain',
  'flashcard',
  'flashcard_state',
  'question',
  'question_flag',
  'question_option',
  'question_task',
  'review_item',
  'scenario',
  'session',
  'session_item',
  'setting',
  'task_statement',
  'trap',
];

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccaf-db-'));
  process.env.DATABASE_PATH = path.join(dir, 'test.db');
});

afterEach(() => {
  closeDb();
  delete process.env.DATABASE_PATH;
  delete process.env.TEST_CLOCK;
  setClockOffsetProvider(() => 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('db', () => {
  it('creates every table on first open', () => {
    getDb();
    closeDb();
    const names = tableNames();
    for (const t of TABLES) expect(names).toContain(t);
  });

  it('opens an already-migrated file again', () => {
    getDb();
    closeDb();
    expect(() => getDb()).not.toThrow();
  });

  it('round-trips a setting', () => {
    setSetting('x', { a: 1 });
    expect(getSetting('x', null)).toEqual({ a: 1 });
    expect(getSetting('missing', 7)).toBe(7);
  });

  it('applies the test clock offset when TEST_CLOCK=1', () => {
    process.env.TEST_CLOCK = '1';
    setSetting('test.clockOffsetMs', 5000);
    expect(Math.abs(now() - Date.now() - 5000)).toBeLessThanOrEqual(50);
  });
});

function tableNames(): string[] {
  const raw = new Database(process.env.DATABASE_PATH);
  const rows = raw.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
    name: string;
  }[];
  raw.close();
  return rows.map((r) => r.name);
}
