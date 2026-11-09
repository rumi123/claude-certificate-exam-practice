import fs from 'node:fs';
import { now, DAY_MS } from '../lib/clock';
import { importContent } from '../lib/content/import';
import { loadContent, type RawContent } from '../lib/content/load';
import { closeDb, getDb, getSqlite } from '../lib/db/client';
import { seededRng, type Rng } from '../lib/rng';

const DB_PATH = '/tmp/ccaf-perf.db';
const COPIES = 3;
const SESSIONS = 200;
const ITEMS = 5000;
const DAYS = 60;

type QuestionFile = { questions: { id: string }[] };

// Three copies of the real bank, with ids P1-S1-001 and so on.
function cloneBank(raw: RawContent): RawContent {
  const questionFiles = [];
  for (let n = 1; n <= COPIES; n++) {
    for (const f of raw.questionFiles) {
      const data = structuredClone(f.data) as QuestionFile;
      for (const q of data.questions) q.id = `P${n}-${q.id}`;
      questionFiles.push({ file: `${f.file}#P${n}`, data });
    }
  }
  return { ...raw, questionFiles };
}

type Opt = { key: string; correct: boolean };

function seedAnswers(rng: Rng): void {
  const sqlite = getSqlite();
  const ids = (sqlite.prepare(`select id from question`).all() as { id: string }[]).map((r) => r.id);
  const options = new Map<string, Opt[]>();
  for (const r of sqlite
    .prepare(`select question_id, key, is_correct from question_option order by position`)
    .all() as { question_id: string; key: string; is_correct: number }[]) {
    const list = options.get(r.question_id) ?? [];
    list.push({ key: r.key, correct: r.is_correct === 1 });
    options.set(r.question_id, list);
  }
  const insertSession = sqlite.prepare(
    `insert into session (id, kind, mode, filters_json, status, started_at, finished_at)
     values (?, 'practice', 'study', '{}', 'completed', ?, ?)`,
  );
  const insertItem = sqlite.prepare(
    `insert into session_item (session_id, position, question_id, option_order_json,
       selected_json, is_correct, correct_selected, confidence, time_ms, answered_at)
     values (?, ?, ?, ?, ?, ?, ?, 'sure', ?, ?)`,
  );
  const insertReview = sqlite.prepare(
    `insert or replace into review_item (question_id, box, due_at, lapses, last_seen_at)
     values (?, 1, ?, 1, ?)`,
  );
  const perSession = ITEMS / SESSIONS;
  const t0 = now();
  sqlite.transaction(() => {
    for (let s = 0; s < SESSIONS; s++) {
      const finished = t0 - Math.floor(rng() * DAYS * DAY_MS);
      const id = `perf-${s}`;
      insertSession.run(id, finished - perSession * 60_000, finished);
      for (let p = 0; p < perSession; p++) {
        const qid = ids[Math.floor(rng() * ids.length)];
        const opts = options.get(qid) ?? [];
        const right = opts.filter((o) => o.correct).map((o) => o.key);
        const wrong = opts.find((o) => !o.correct)?.key ?? right[0];
        const ok = rng() < 0.65;
        const at = finished - (perSession - p) * 60_000;
        insertItem.run(
          id,
          p,
          qid,
          JSON.stringify(opts.map((o) => o.key)),
          JSON.stringify(ok ? right : [wrong]),
          ok ? 1 : 0,
          ok ? right.length : 0,
          30_000 + Math.floor(rng() * 90_000),
          at,
        );
        if (!ok) insertReview.run(qid, at + DAY_MS, at);
      }
    }
  })();
}

function main(): void {
  for (const ext of ['', '-wal', '-shm']) fs.rmSync(`${DB_PATH}${ext}`, { force: true });
  process.env.DATABASE_PATH = DB_PATH;
  const db = getDb();
  const result = importContent(db, cloneBank(loadContent()));
  seedAnswers(seededRng(1));
  console.log(`seed-perf: ${result.inserted} questions, ${ITEMS} answers in ${SESSIONS} sessions -> ${DB_PATH}`);
}

try {
  main();
} finally {
  closeDb();
}
