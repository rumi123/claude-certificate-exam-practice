import { now } from '@/lib/clock';
import type { Db } from '@/lib/db/client';
import * as t from '@/lib/db/schema';
import type { Backup } from './schema';

// Keys with this prefix belong to the test harness, never to the user's progress.
export const TEST_SETTING_PREFIX = 'test.';

export function exportBackup(db: Db): Backup {
  return {
    format: 'ccaf-backup',
    schemaVersion: 1,
    exportedAt: now(),
    tables: {
      session: db.select().from(t.session).all(),
      session_item: db.select().from(t.sessionItem).all(),
      review_item: db.select().from(t.reviewItem).all(),
      question_flag: db.select().from(t.questionFlag).all(),
      flashcard_state: db.select().from(t.flashcardState).all(),
      setting: db
        .select()
        .from(t.setting)
        .all()
        .filter((s) => !s.key.startsWith(TEST_SETTING_PREFIX)),
    },
  };
}

// YYYYMMDD of a timestamp, in local time, for download file names.
export function dateStamp(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}
