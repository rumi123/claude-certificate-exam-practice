import { createHash } from 'node:crypto';
import { eq, inArray, and, ne } from 'drizzle-orm';
import { now } from '../clock';
import type { Db } from '../db/client';
import * as t from '../db/schema';
import type { RawContent } from './load';
import {
  FlashcardsSchema,
  LessonFileSchema,
  MockFileSchema,
  QuestionFileSchema,
  SyllabusSchema,
  TrapsSchema,
  type Lesson,
  type Question,
} from './schemas';

export interface Counts {
  inserted: number;
  updated: number;
  unchanged: number;
  retired: number;
}

export interface ImportResult extends Counts {
  cards: Counts;
  mocks: Counts;
  lessons: Counts;
  skippedDrafts: string[];
}

function emptyCounts(): Counts {
  return { inserted: 0, updated: 0, unchanged: 0, retired: 0 };
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value).sort()) out[k] = stable((value as Record<string, unknown>)[k]);
    return out;
  }
  return value;
}

export function hashQuestion(q: Question): string {
  return createHash('sha256').update(JSON.stringify(stable(q))).digest('hex');
}

function upsertCatalog(tx: Db, syllabus: ReturnType<typeof SyllabusSchema.parse>, traps: ReturnType<typeof TrapsSchema.parse>) {
  for (const d of syllabus.domains) {
    const row = { id: d.id, slug: d.slug, name: d.name, weight: d.weight };
    tx.insert(t.domain).values(row).onConflictDoUpdate({ target: t.domain.id, set: row }).run();
  }
  for (const k of syllabus.tasks) {
    const row = {
      id: k.id,
      domainId: k.domain,
      title: k.title,
      researchAnchor: k.researchAnchor,
      lessonUrl: k.lessonUrl,
      knowledgeJson: JSON.stringify(k.knowledge),
      skillsJson: JSON.stringify(k.skills),
    };
    tx.insert(t.taskStatement).values(row).onConflictDoUpdate({ target: t.taskStatement.id, set: row }).run();
  }
  for (const s of syllabus.scenarios) {
    const row = { id: s.id, slug: s.slug, name: s.name, setup: s.setup, toolsJson: JSON.stringify(s.tools) };
    tx.insert(t.scenario).values(row).onConflictDoUpdate({ target: t.scenario.id, set: row }).run();
  }
  for (const p of traps.traps) {
    const row = {
      id: p.id,
      name: p.name,
      description: p.description,
      principle: p.principle,
      examplesJson: JSON.stringify(p.examples),
    };
    tx.insert(t.trap).values(row).onConflictDoUpdate({ target: t.trap.id, set: row }).run();
  }
}

function writeQuestionChildren(tx: Db, q: Question) {
  tx.delete(t.questionOption).where(eq(t.questionOption.questionId, q.id)).run();
  tx.delete(t.questionTask).where(eq(t.questionTask.questionId, q.id)).run();
  q.options.forEach((o, position) => {
    tx.insert(t.questionOption)
      .values({
        questionId: q.id,
        key: o.id,
        position,
        text: o.text,
        isCorrect: o.correct ? 1 : 0,
        explanation: o.explanation,
        trapId: o.trap,
      })
      .run();
  });
  tx.insert(t.questionTask).values({ questionId: q.id, taskId: q.primaryTask, isPrimary: 1 }).run();
  for (const taskId of q.secondaryTasks) {
    tx.insert(t.questionTask).values({ questionId: q.id, taskId, isPrimary: 0 }).run();
  }
}

interface PoolItem {
  scenarioId: string;
  q: Question;
}

function addCounts(a: Counts, b: Counts): Counts {
  return {
    inserted: a.inserted + b.inserted,
    updated: a.updated + b.updated,
    unchanged: a.unchanged + b.unchanged,
    retired: a.retired + b.retired,
  };
}

// Imports one pool and retires that pool's questions that are no longer in `items`.
function importPool(
  tx: Db,
  pool: string,
  items: PoolItem[],
  taskDomain: Map<string, string>,
): Counts {
  const counts = emptyCounts();
  const seen = new Set<string>();
  const existing = new Map(
    tx
      .select({ id: t.question.id, hash: t.question.contentHash, version: t.question.version, retired: t.question.retired })
      .from(t.question)
      .all()
      .map((r) => [r.id, r]),
  );
  for (const { scenarioId, q } of items) {
    seen.add(q.id);
    const hash = hashQuestion(q);
    const prev = existing.get(q.id);
    if (prev && prev.hash === hash) {
      if (prev.retired) {
        tx.update(t.question).set({ retired: 0 }).where(eq(t.question.id, q.id)).run();
        counts.updated++;
      } else {
        counts.unchanged++;
      }
      continue;
    }
    const row = {
      scenarioId,
      domainId: taskDomain.get(q.primaryTask) as string,
      primaryTaskId: q.primaryTask,
      pool,
      type: q.type,
      selectCount: q.selectCount,
      difficulty: q.difficulty,
      stem: q.stem,
      keyConcept: q.keyConcept,
      studyRef: q.studyRef,
      contentHash: hash,
      retired: 0,
    };
    if (!prev) {
      tx.insert(t.question).values({ id: q.id, ...row, version: 1 }).run();
      counts.inserted++;
    } else {
      const version = prev.version + 1;
      tx.update(t.question).set({ ...row, version }).where(eq(t.question.id, q.id)).run();
      counts.updated++;
    }
    writeQuestionChildren(tx, q);
  }
  const stale = tx
    .select({ id: t.question.id })
    .from(t.question)
    .where(and(eq(t.question.pool, pool), eq(t.question.retired, 0)))
    .all()
    .filter((r) => !seen.has(r.id))
    .map((r) => r.id);
  if (stale.length) {
    tx.update(t.question).set({ retired: 1 }).where(inArray(t.question.id, stale)).run();
    counts.retired = stale.length;
  }
  return counts;
}

function importQuestions(
  tx: Db,
  files: ReturnType<typeof QuestionFileSchema.parse>[],
  taskDomain: Map<string, string>,
): Counts {
  const items = files.flatMap((f) => f.questions.map((q) => ({ scenarioId: f.scenario, q })));
  return importPool(tx, 'practice', items, taskDomain);
}

// Every ready mock pool in the files, plus mock pools already in the database whose file is gone
// or is a draft (those are retired).
function importMocks(
  tx: Db,
  files: ReturnType<typeof MockFileSchema.parse>[],
  taskDomain: Map<string, string>,
): { counts: Counts; skippedDrafts: string[] } {
  const byPool = new Map<string, PoolItem[]>();
  const skippedDrafts: string[] = [];
  for (const f of files) {
    if (f.status === 'draft') {
      skippedDrafts.push(f.pool);
      continue;
    }
    const items = byPool.get(f.pool) ?? [];
    for (const { scenario, ...q } of f.questions) items.push({ scenarioId: scenario, q: { ...q } });
    byPool.set(f.pool, items);
  }
  const known = tx
    .selectDistinct({ pool: t.question.pool })
    .from(t.question)
    .where(ne(t.question.pool, 'practice'))
    .all();
  for (const { pool } of known) if (!byPool.has(pool)) byPool.set(pool, []);
  let total = emptyCounts();
  for (const [pool, items] of [...byPool].sort(([a], [b]) => a.localeCompare(b))) {
    total = addCounts(total, importPool(tx, pool, items, taskDomain));
  }
  return { counts: total, skippedDrafts };
}

// Lessons are keyed by question id; rows whose lesson is gone from the files are deleted.
function importLessons(tx: Db, files: ReturnType<typeof LessonFileSchema.parse>[]): Counts {
  const counts = emptyCounts();
  const lessons = new Map<string, Lesson>();
  for (const f of files) for (const l of f.lessons) lessons.set(l.questionId, l);
  const known = new Set(
    tx
      .select({ id: t.question.id })
      .from(t.question)
      .all()
      .map((r) => r.id),
  );
  const existing = new Map(
    tx
      .select()
      .from(t.questionLesson)
      .all()
      .map((r) => [r.questionId, r]),
  );
  for (const [id, lesson] of lessons) {
    if (!known.has(id)) throw new Error(`Lesson for unknown question ${id}`);
    const hash = createHash('sha256').update(JSON.stringify(stable(lesson))).digest('hex');
    const prev = existing.get(id);
    const row = { lessonJson: JSON.stringify(lesson), contentHash: hash };
    if (!prev) {
      tx.insert(t.questionLesson).values({ questionId: id, ...row }).run();
      counts.inserted++;
    } else if (prev.contentHash === hash) {
      counts.unchanged++;
    } else {
      tx.update(t.questionLesson).set(row).where(eq(t.questionLesson.questionId, id)).run();
      counts.updated++;
    }
  }
  const stale = [...existing.keys()].filter((id) => !lessons.has(id));
  if (stale.length) {
    tx.delete(t.questionLesson).where(inArray(t.questionLesson.questionId, stale)).run();
    counts.retired = stale.length;
  }
  return counts;
}

function importCards(
  tx: Db,
  cards: ReturnType<typeof FlashcardsSchema.parse>['cards'],
  taskDomain: Map<string, string>,
): Counts {
  const counts = emptyCounts();
  const existing = new Map(
    tx
      .select()
      .from(t.flashcard)
      .all()
      .map((r) => [r.id, r]),
  );
  const seen = new Set<string>();
  for (const c of cards) {
    seen.add(c.id);
    const row = {
      deck: c.deck,
      taskId: c.task,
      domainId: taskDomain.get(c.task) ?? null,
      trapId: c.trap ?? null,
      front: c.front,
      back: c.back,
      retired: 0,
    };
    const prev = existing.get(c.id);
    if (!prev) {
      tx.insert(t.flashcard).values({ id: c.id, ...row }).run();
      counts.inserted++;
    } else if (
      prev.deck === row.deck &&
      prev.taskId === row.taskId &&
      prev.domainId === row.domainId &&
      prev.trapId === row.trapId &&
      prev.front === row.front &&
      prev.back === row.back &&
      !prev.retired
    ) {
      counts.unchanged++;
    } else {
      tx.update(t.flashcard).set(row).where(eq(t.flashcard.id, c.id)).run();
      counts.updated++;
    }
  }
  const stale = [...existing.values()].filter((r) => !seen.has(r.id) && !r.retired).map((r) => r.id);
  if (stale.length) {
    tx.update(t.flashcard).set({ retired: 1 }).where(inArray(t.flashcard.id, stale)).run();
    counts.retired = stale.length;
  }
  return counts;
}

function versionMap(raw: RawContent): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of [raw.syllabus, raw.traps, raw.flashcards, raw.cheatsheet, ...raw.questionFiles, ...raw.mockFiles]) {
    const v = (f.data as { version?: number }).version;
    const name = raw.questionFiles.includes(f) ? `questions/${f.file}` : f.file;
    if (typeof v === 'number') out[name] = v;
  }
  return out;
}

export function importContent(db: Db, raw: RawContent): ImportResult {
  const syllabus = SyllabusSchema.parse(raw.syllabus.data);
  const traps = TrapsSchema.parse(raw.traps.data);
  const flashcards = FlashcardsSchema.parse(raw.flashcards.data);
  const files = raw.questionFiles.map((f) => QuestionFileSchema.parse(f.data));
  const mockFiles = raw.mockFiles.map((f) => MockFileSchema.parse(f.data));
  const lessonFiles = raw.lessonFiles.map((f) => LessonFileSchema.parse(f.data));
  const taskDomain = new Map(syllabus.tasks.map((k) => [k.id, k.domain]));

  return db.transaction((tx) => {
    const d = tx as unknown as Db;
    upsertCatalog(d, syllabus, traps);
    const q = importQuestions(d, files, taskDomain);
    const { counts: mocks, skippedDrafts } = importMocks(d, mockFiles, taskDomain);
    const draftIds = new Set(
      mockFiles.filter((f) => f.status === 'draft').flatMap((f) => f.questions.map((x) => x.id)),
    );
    const lessons = importLessons(
      d,
      lessonFiles.map((f) => ({ ...f, lessons: f.lessons.filter((l) => !draftIds.has(l.questionId)) })),
    );
    const cards = importCards(d, flashcards.cards, taskDomain);
    const meta = [
      { key: 'versions', value: JSON.stringify(versionMap(raw)) },
      { key: 'importedAt', value: JSON.stringify(now()) },
    ];
    for (const m of meta) {
      d.insert(t.contentMeta).values(m).onConflictDoUpdate({ target: t.contentMeta.key, set: { value: m.value } }).run();
    }
    return { ...q, cards, mocks, lessons, skippedDrafts };
  });
}
