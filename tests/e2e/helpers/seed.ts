import Database from 'better-sqlite3';
import { E2E_DB } from './db';

export type SeedAnswer = {
  questionId: string;
  correct: boolean;
  // Picks the wrong option carrying this trap (only used when `correct` is false).
  pickTrap?: string;
  confidence?: 'sure' | 'unsure' | 'guess' | null;
  timeMs?: number;
};

// Inserts one completed study session whose items are already answered.
export function seedSession(
  answers: SeedAnswer[],
  finishedAt = Date.now(),
  opts: { mode?: 'study' | 'test'; status?: 'completed' | 'abandoned'; marked?: number[] } = {},
): string {
  const db = new Database(E2E_DB);
  const id = `seed-${finishedAt}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    db.transaction(() => {
      db.prepare(
        `insert into session (id, kind, mode, filters_json, status, started_at, finished_at)
         values (?, 'practice', ?, '{}', ?, ?, ?)`,
      ).run(
        id,
        opts.mode ?? 'study',
        opts.status ?? 'completed',
        finishedAt - 60_000 * answers.length,
        finishedAt,
      );
      const options = db.prepare(
        `select key, is_correct, trap_id from question_option where question_id = ? order by position`,
      );
      const insert = db.prepare(
        `insert into session_item (session_id, position, question_id, option_order_json,
           selected_json, is_correct, correct_selected, confidence, time_ms, answered_at, marked)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      answers.forEach((a, position) => {
        const rows = options.all(a.questionId) as {
          key: string;
          is_correct: number;
          trap_id: string | null;
        }[];
        const right = rows.filter((r) => r.is_correct === 1).map((r) => r.key);
        const wrong = (
          (a.pickTrap && rows.find((r) => r.trap_id === a.pickTrap)) ||
          rows.find((r) => r.is_correct === 0)!
        ).key;
        insert.run(
          id,
          position,
          a.questionId,
          JSON.stringify(rows.map((r) => r.key)),
          JSON.stringify(a.correct ? right : [wrong]),
          a.correct ? 1 : 0,
          a.correct ? right.length : 0,
          a.confidence === undefined ? 'sure' : a.confidence,
          a.timeMs ?? 60_000,
          finishedAt - 60_000 * (answers.length - position),
          opts.marked?.includes(position) ? 1 : 0,
        );
      });
    })();
  } finally {
    db.close();
  }
  return id;
}

// Inserts one in-progress session with one unanswered item in the given option order.
export function seedOpenSession(
  questionId: string,
  optionOrder: string[],
  mode: 'study' | 'test',
): string {
  const db = new Database(E2E_DB);
  const startedAt = Date.now();
  const id = `open-${startedAt}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    db.transaction(() => {
      db.prepare(
        `insert into session (id, kind, mode, filters_json, status, started_at)
         values (?, 'practice', ?, '{}', 'in_progress', ?)`,
      ).run(id, mode, startedAt);
      db.prepare(
        `insert into session_item (session_id, position, question_id, option_order_json)
         values (?, 0, ?, ?)`,
      ).run(id, questionId, JSON.stringify(optionOrder));
    })();
  } finally {
    db.close();
  }
  return id;
}

export function clearProgress(): void {
  const db = new Database(E2E_DB);
  try {
    db.exec(`delete from session_item; delete from session; delete from review_item;`);
  } finally {
    db.close();
  }
}
