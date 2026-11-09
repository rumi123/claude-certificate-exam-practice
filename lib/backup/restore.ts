import type { Db } from '@/lib/db/client';
import * as t from '@/lib/db/schema';
import { TEST_SETTING_PREFIX } from './export';
import { BACKUP_TABLES, BackupSchema, type Backup, type BackupTable } from './schema';

export type Counts = Record<BackupTable, number>;
export type Preview = { ok: true; counts: Counts } | { ok: false; errors: string[] };

const MAX_ERRORS = 20;

function unknownIds(label: string, used: string[], known: Set<string>, what: string): string[] {
  return [...new Set(used.filter((id) => !known.has(id)))].map(
    (id) => `Unknown ${what} ID ${id} in ${label}`,
  );
}

function checkReferences(db: Db, b: Backup): string[] {
  const questions = new Set(
    db
      .select({ id: t.question.id })
      .from(t.question)
      .all()
      .map((r) => r.id),
  );
  const cards = new Set(
    db
      .select({ id: t.flashcard.id })
      .from(t.flashcard)
      .all()
      .map((r) => r.id),
  );
  const sessions = new Set(b.tables.session.map((s) => s.id));
  const orphans = b.tables.session_item.filter((i) => !sessions.has(i.sessionId));
  return [
    ...unknownIds(
      'session_item',
      b.tables.session_item.map((r) => r.questionId),
      questions,
      'question',
    ),
    ...unknownIds(
      'review_item',
      b.tables.review_item.map((r) => r.questionId),
      questions,
      'question',
    ),
    ...unknownIds(
      'question_flag',
      b.tables.question_flag.map((r) => r.questionId),
      questions,
      'question',
    ),
    ...unknownIds(
      'flashcard_state',
      b.tables.flashcard_state.map((r) => r.cardId),
      cards,
      'card',
    ),
    ...[...new Set(orphans.map((i) => i.sessionId))].map(
      (id) => `session_item refers to missing session ${id}`,
    ),
  ];
}

function parseBackup(
  db: Db,
  text: string,
): { ok: true; backup: Backup } | { ok: false; errors: string[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['The file is not valid JSON'] };
  }
  const parsed = BackupSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .slice(0, MAX_ERRORS)
      .map((i) => `${i.path.join('.') || 'backup'}: ${i.message}`);
    return { ok: false, errors };
  }
  const errors = checkReferences(db, parsed.data);
  if (errors.length > 0) return { ok: false, errors: errors.slice(0, MAX_ERRORS) };
  return { ok: true, backup: parsed.data };
}

export function previewRestore(db: Db, text: string): Preview {
  const res = parseBackup(db, text);
  if (!res.ok) return res;
  const counts = Object.fromEntries(
    BACKUP_TABLES.map((k) => [k, res.backup.tables[k].length]),
  ) as Counts;
  return { ok: true, counts };
}

// Child table first, because session_item refers to session.
function wipeProgress(tx: Db): void {
  tx.delete(t.sessionItem).run();
  tx.delete(t.session).run();
  tx.delete(t.reviewItem).run();
  tx.delete(t.questionFlag).run();
  tx.delete(t.flashcardState).run();
  // Test-harness settings survive: keep their rows, clear the table, put them back.
  const keep = tx
    .select()
    .from(t.setting)
    .all()
    .filter((s) => s.key.startsWith(TEST_SETTING_PREFIX));
  tx.delete(t.setting).run();
  insertAll(keep, (c) => tx.insert(t.setting).values(c).run());
}

export function resetProgress(db: Db): void {
  db.transaction((tx) => wipeProgress(tx as unknown as Db));
}

function insertAll<T extends object>(rows: T[], insert: (chunk: T[]) => void): void {
  for (let i = 0; i < rows.length; i += 200) insert(rows.slice(i, i + 200));
}

// Replaces all progress with the backup's rows. Throws when the text does not pass the preview.
export function restoreBackup(db: Db, text: string): Counts {
  const res = parseBackup(db, text);
  if (!res.ok) throw new Error(res.errors.join('; '));
  const { tables } = res.backup;
  db.transaction((raw) => {
    const tx = raw as unknown as Db;
    wipeProgress(tx);
    insertAll(tables.session, (c) => tx.insert(t.session).values(c).run());
    insertAll(tables.session_item, (c) => tx.insert(t.sessionItem).values(c).run());
    insertAll(tables.review_item, (c) => tx.insert(t.reviewItem).values(c).run());
    insertAll(tables.question_flag, (c) => tx.insert(t.questionFlag).values(c).run());
    insertAll(tables.flashcard_state, (c) => tx.insert(t.flashcardState).values(c).run());
    insertAll(
      tables.setting.filter((s) => !s.key.startsWith(TEST_SETTING_PREFIX)),
      (c) => tx.insert(t.setting).values(c).run(),
    );
  });
  return Object.fromEntries(BACKUP_TABLES.map((k) => [k, tables[k].length])) as Counts;
}
