import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dateStamp, exportBackup } from '@/lib/backup/export';
import { previewRestore, resetProgress, restoreBackup } from '@/lib/backup/restore';
import { BACKUP_TABLES } from '@/lib/backup/schema';
import { importContent } from '@/lib/content/import';
import { loadContent } from '@/lib/content/load';
import { closeDb, getDb } from '@/lib/db/client';
import { loadReport } from '@/lib/db/queries/report';
import { addFlag } from '@/lib/db/queries/questions';
import { rateCard } from '@/lib/db/queries/flashcards';
import {
  createSession,
  finishSession,
  getCandidates,
  recordAnswer,
} from '@/lib/db/queries/sessions';
import { setSetting } from '@/lib/db/settings';
import * as t from '@/lib/db/schema';

let dir: string;
const NOW = 1_800_000_000_000;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccaf-backup-'));
  process.env.DATABASE_PATH = path.join(dir, 'test.db');
  importContent(getDb(), loadContent('tests/fixtures/content'));
});

afterEach(() => {
  closeDb();
  delete process.env.DATABASE_PATH;
  fs.rmSync(dir, { recursive: true, force: true });
});

function seedProgress(): void {
  const ids = getCandidates({ scenarios: ['S1'] })
    .slice(0, 4)
    .map((c) => c.id);
  const id = createSession({
    kind: 'practice',
    mode: 'study',
    filters: {},
    timeLimitS: null,
    items: ids.map((questionId, position) => ({
      questionId,
      position,
      optionOrder: ['a', 'b', 'c', 'd'],
    })),
  });
  ids.forEach((questionId, position) => {
    const q = getDb().select().from(t.question).where(eq(t.question.id, questionId)).get()!;
    // Alternate between the first and last keys so some answers are wrong.
    const keys = ['a', 'b', 'c', 'd'];
    const selected = position % 2 ? keys.slice(0, q.selectCount) : keys.slice(-q.selectCount);
    recordAnswer({
      sessionId: id,
      position,
      selected,
      confidence: 'sure',
      timeMs: 5000 + position,
    });
  });
  finishSession(id, 'user');
  addFlag(ids[0], 'bad wording', NOW);
  rateCard(getDb().select().from(t.flashcard).limit(1).get()!.id, 'good', NOW);
  setSetting('pref.theme', 'dark');
  setSetting('test.clockOffsetMs', 7);
}

function counts() {
  const db = getDb();
  return {
    session: db.select().from(t.session).all().length,
    session_item: db.select().from(t.sessionItem).all().length,
    review_item: db.select().from(t.reviewItem).all().length,
    question_flag: db.select().from(t.questionFlag).all().length,
    flashcard_state: db.select().from(t.flashcardState).all().length,
    setting: db.select().from(t.setting).all().length,
  };
}

describe('backup', () => {
  it('round-trips export, reset and restore', () => {
    seedProgress();
    const before = counts();
    const report = loadReport(NOW);
    const questions = getDb().select().from(t.question).all().length;
    const meta = getDb().select().from(t.contentMeta).all();
    expect(before.session_item).toBe(4);
    expect(before.review_item).toBeGreaterThan(0);

    const backup = exportBackup(getDb());
    expect(backup.tables.setting.some((s) => s.key.startsWith('test.'))).toBe(false);
    const text = JSON.stringify(backup);

    resetProgress(getDb());
    expect(BACKUP_TABLES.filter((k) => k !== 'setting').map((k) => counts()[k])).toEqual([
      0, 0, 0, 0, 0,
    ]);
    expect(
      getDb()
        .select()
        .from(t.setting)
        .all()
        .map((s) => s.key),
    ).toEqual(['test.clockOffsetMs']);
    expect(getDb().select().from(t.question).all()).toHaveLength(questions);
    expect(getDb().select().from(t.contentMeta).all()).toEqual(meta);

    const preview = previewRestore(getDb(), text);
    expect(preview).toMatchObject({ ok: true, counts: { session_item: 4, session: 1 } });
    restoreBackup(getDb(), text);
    expect(counts()).toEqual(before);
    expect(loadReport(NOW)).toEqual(report);
  });

  it('names an unknown question ID in the preview', () => {
    seedProgress();
    const backup = exportBackup(getDb());
    backup.tables.review_item[0].questionId = 'ZZ-999';
    const res = previewRestore(getDb(), JSON.stringify(backup));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.join(' ')).toContain('ZZ-999');
    expect(() => restoreBackup(getDb(), JSON.stringify(backup))).toThrow(/ZZ-999/);
  });

  it('rejects schemaVersion 2 and non-JSON', () => {
    const backup = { ...exportBackup(getDb()), schemaVersion: 2 };
    const res = previewRestore(getDb(), JSON.stringify(backup));
    expect(res.ok).toBe(false);
    expect(previewRestore(getDb(), 'nope').ok).toBe(false);
  });

  it('formats the file date', () => {
    expect(dateStamp(new Date(2026, 10, 9, 12).getTime())).toBe('20261109');
  });
});
