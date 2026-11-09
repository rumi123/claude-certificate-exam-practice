import type { ZodType } from 'zod';
import { buildCoverage, type Coverage } from './coverage';
import type { RawContent } from './load';
import {
  CheatsheetSchema,
  FlashcardsSchema,
  QuestionFileSchema,
  SyllabusSchema,
  TrapsSchema,
  type Cheatsheet,
  type Flashcards,
  type Question,
  type QuestionFile,
  type Syllabus,
  type Traps,
} from './schemas';
import {
  ALWAYS_WRONG_COUNT,
  CONCEPT_CARDS_PER_TASK,
  DIFFICULTY_TARGET,
  DIFFICULTY_TOLERANCE,
  DOMAIN_MIX,
  MAX_LONGEST_CORRECT_SHARE,
  MAX_TRAP_SHARE,
  MIN_DISTINCT_TRAPS,
  MULTI_PER_FILE,
  QUESTIONS_PER_FILE,
  TASK_PLAN,
} from './targets';

export interface Issue {
  file: string;
  id?: string;
  message: string;
}

export interface ValidationResult {
  errors: Issue[];
  warnings: Issue[];
  coverage: Coverage;
}

const LETTER_REF =
  /\b(option|answer|choice)\s+[A-E]\b|\b[A-E]\)|\(\s*[A-E]\s*\)|\b(above|below|first|second|third|last) option\b/i;

const words = (s: string): number => s.split(/\s+/).filter(Boolean).length;
const normalise = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ').trim();

class Collector {
  errors: Issue[] = [];
  warnings: Issue[] = [];
  error(file: string, message: string, id?: string): void {
    this.errors.push({ file, id, message });
  }
  warn(file: string, message: string, id?: string): void {
    this.warnings.push({ file, id, message });
  }
}

interface Refs {
  tasks: Set<string>;
  traps: Set<string>;
  sources: Set<string>;
  domains: Set<string>;
}

function parseWith<T>(schema: ZodType<T>, file: string, data: unknown, out: Collector): T | null {
  const res = schema.safeParse(data);
  if (res.success) return res.data;
  for (const issue of res.error.issues) {
    const where = issue.path.length ? `${issue.path.join('.')}: ` : '';
    const id = questionIdAt(data, issue.path);
    out.error(file, `${where}${issue.message}`, id);
  }
  return null;
}

function questionIdAt(data: unknown, path: PropertyKey[]): string | undefined {
  if (path[0] !== 'questions' || typeof path[1] !== 'number') return undefined;
  const q = (data as { questions?: { id?: unknown }[] })?.questions?.[path[1]];
  return typeof q?.id === 'string' ? q.id : undefined;
}

function checkTrap(file: string, trap: string, refs: Refs, out: Collector, where: string, id?: string): void {
  if (!refs.traps.has(trap)) out.error(file, `${where} uses unknown trap "${trap}"`, id);
}

function checkQuestion(file: string, scenario: string, q: Question, refs: Refs, out: Collector): number {
  const err = (m: string) => out.error(file, m, q.id);
  const multi = q.type === 'multi';
  if (!q.id.startsWith(`${scenario}-`)) err(`id must start with "${scenario}-"`);
  if (q.selectCount !== (multi ? 2 : 1)) err(`selectCount ${q.selectCount} does not match type ${q.type}`);
  for (const t of [q.primaryTask, ...q.secondaryTasks]) {
    if (!refs.tasks.has(t)) err(`unknown task ${t}`);
  }
  if (q.secondaryTasks.includes(q.primaryTask)) err('secondaryTasks contains the primary task');
  const stemWords = words(q.stem);
  if (stemWords < 40 || stemWords > 110) err(`stem has ${stemWords} words (need 40-110)`);
  if (multi && !q.stem.trimEnd().endsWith('(Select 2.)')) err('multi stem must end with "(Select 2.)"');
  const concept = words(q.keyConcept);
  if (concept < 8 || concept > 25) err(`keyConcept has ${concept} words (need 8-25)`);
  for (const s of q.sources) if (!refs.sources.has(s)) err(`unknown source "${s}"`);

  const options = q.options;
  if (options.length !== (multi ? 5 : 4)) err(`${q.type} question needs ${multi ? 5 : 4} options, has ${options.length}`);
  if (options.some((o, i) => o.id !== 'abcde'[i])) err('option ids must run a, b, c... in order');
  const correct = options.filter((o) => o.correct);
  if (correct.length !== (multi ? 2 : 1)) {
    err(`${q.type} question needs ${multi ? 2 : 1} correct options, has ${correct.length}`);
  }

  const wrongTraps: string[] = [];
  for (const o of options) {
    const tag = `option ${o.id}`;
    const w = words(o.text);
    if (w < 8 || w > 60) err(`${tag} text has ${w} words (need 8-60)`);
    if (o.explanation.length < 40) err(`${tag} explanation is shorter than 40 characters`);
    if (LETTER_REF.test(o.explanation) || LETTER_REF.test(o.text)) {
      err(`${tag} refers to an option letter or position`);
    }
    if (o.correct) {
      if (o.trap !== null) err(`${tag} is correct but has trap "${o.trap}"`);
    } else if (o.trap === null) {
      err(`${tag} is wrong but has no trap`);
    } else {
      wrongTraps.push(o.trap);
      checkTrap(file, o.trap, refs, out, tag, q.id);
    }
  }
  if (new Set(wrongTraps).size < 2) err('wrong options need at least 2 distinct traps');
  if (wrongTraps.filter((t) => t === 'NONEXISTENT_FEATURE').length > 1) {
    err('more than one NONEXISTENT_FEATURE option');
  }
  return correctIsLongest(q) ? 1 : 0;
}

function correctIsLongest(q: Question): boolean {
  const max = Math.max(...q.options.map((o) => o.text.length));
  return q.options.some((o) => o.correct && o.text.length === max);
}

function checkFileWarnings(f: RawFileOf<QuestionFile>, longest: number, refs: RefsFull, out: Collector): void {
  const { file, data } = f;
  const qs = data.questions;
  if (qs.length !== QUESTIONS_PER_FILE) out.warn(file, `has ${qs.length} questions (expected ${QUESTIONS_PER_FILE})`);
  const multi = qs.filter((q) => q.type === 'multi').length;
  if (multi !== MULTI_PER_FILE) out.warn(file, `has ${multi} multi questions (expected ${MULTI_PER_FILE})`);

  const domainOf = new Map<string, string>();
  for (const [id, domain] of refs.taskDomain) domainOf.set(id, domain);
  const mix: Record<string, number> = {};
  const taskCount: Record<string, number> = {};
  for (const q of qs) {
    const d = domainOf.get(q.primaryTask) ?? 'unknown';
    mix[d] = (mix[d] ?? 0) + 1;
    taskCount[q.primaryTask] = (taskCount[q.primaryTask] ?? 0) + 1;
  }
  const target = DOMAIN_MIX[data.scenario] ?? {};
  const keys = [...new Set([...Object.keys(mix), ...Object.keys(target)])].sort();
  if (keys.some((k) => (mix[k] ?? 0) !== (target[k] ?? 0))) {
    const fmt = (m: Record<string, number>) => keys.map((k) => `${k}=${m[k] ?? 0}`).join(' ');
    out.warn(file, `domain mix ${fmt(mix)} differs from plan ${fmt(target)}`);
  }
  for (const task of Object.keys(TASK_PLAN[data.scenario] ?? {})) {
    if (!taskCount[task]) out.warn(file, `planned task ${task} has no question`);
  }
  const diff: Record<number, number> = {};
  for (const q of qs) diff[q.difficulty] = (diff[q.difficulty] ?? 0) + 1;
  for (const [level, want] of Object.entries(DIFFICULTY_TARGET)) {
    const got = diff[Number(level)] ?? 0;
    if (Math.abs(got - want) > DIFFICULTY_TOLERANCE) {
      out.warn(file, `difficulty ${level} has ${got} questions (target about ${want})`);
    }
  }
  if (longest > MAX_LONGEST_CORRECT_SHARE * qs.length) {
    out.warn(file, `correct option is the longest in ${longest}/${qs.length} questions`);
  }
  const trapCount: Record<string, number> = {};
  let wrong = 0;
  for (const q of qs) {
    for (const o of q.options) {
      if (o.correct || o.trap === null) continue;
      trapCount[o.trap] = (trapCount[o.trap] ?? 0) + 1;
      wrong++;
    }
  }
  const distinct = Object.keys(trapCount).length;
  if (distinct < MIN_DISTINCT_TRAPS) out.warn(file, `only ${distinct} distinct traps (want ${MIN_DISTINCT_TRAPS}+)`);
  for (const [trap, n] of Object.entries(trapCount)) {
    if (n > MAX_TRAP_SHARE * wrong) out.warn(file, `trap ${trap} is on ${n}/${wrong} wrong options`);
  }
  if (qs.filter((q) => q.beyondGuide).length > 1) {
    out.error(file, 'more than one beyondGuide question');
  }
}

interface RawFileOf<T> {
  file: string;
  data: T;
}

type RefsFull = Refs & { taskDomain: Map<string, string> };

function checkQuestionFiles(files: RawFileOf<QuestionFile>[], refs: RefsFull, out: Collector): void {
  const seenIds = new Map<string, string>();
  const stems = new Map<string, string>();
  for (const f of files) {
    let longest = 0;
    for (const q of f.data.questions) {
      const first = seenIds.get(q.id);
      if (first) out.error(f.file, `duplicate id (also in ${first})`, q.id);
      else seenIds.set(q.id, f.file);
      const stem = normalise(q.stem);
      const same = stems.get(stem);
      if (same) out.error(f.file, `stem duplicates ${same}`, q.id);
      else stems.set(stem, q.id);
      longest += checkQuestion(f.file, f.data.scenario, q, refs, out);
    }
    checkFileWarnings(f, longest, refs, out);
  }
}

function checkFlashcards(file: string, fc: Flashcards, syllabus: Syllabus | null, refs: RefsFull, out: Collector): void {
  const seen = new Set<string>();
  const conceptPerTask: Record<string, number> = {};
  const antiTraps = new Set<string>();
  for (const c of fc.cards) {
    if (seen.has(c.id)) out.error(file, 'duplicate id', c.id);
    seen.add(c.id);
    if (!refs.tasks.has(c.task)) out.error(file, `unknown task ${c.task}`, c.id);
    if (c.trap !== undefined) checkTrap(file, c.trap, refs, out, 'card', c.id);
    if (c.deck === 'anti-patterns') {
      if (c.trap === undefined) out.error(file, 'anti-patterns card has no trap', c.id);
      else antiTraps.add(c.trap);
    } else {
      conceptPerTask[c.task] = (conceptPerTask[c.task] ?? 0) + 1;
    }
    const f = words(c.front);
    if (f > 30) out.error(file, `front has ${f} words (max 30)`, c.id);
    const b = words(c.back);
    if (b > 60) out.error(file, `back has ${b} words (max 60)`, c.id);
  }
  if (!syllabus) return;
  for (const t of syllabus.tasks) {
    const n = conceptPerTask[t.id] ?? 0;
    if (n !== CONCEPT_CARDS_PER_TASK) out.warn(file, `task ${t.id} has ${n} concept cards (expected ${CONCEPT_CARDS_PER_TASK})`);
  }
  for (const trap of refs.traps) {
    if (!antiTraps.has(trap)) out.warn(file, `trap ${trap} has no anti-pattern card`);
  }
}

function checkCheatsheet(file: string, cs: Cheatsheet, refs: RefsFull, out: Collector): void {
  for (const d of cs.decisions) {
    if (!refs.tasks.has(d.task)) out.error(file, `decision "${d.situation}" has unknown task ${d.task}`);
  }
  for (const a of cs.alwaysWrong) checkTrap(file, a.trap, refs, out, 'alwaysWrong item', undefined);
  if (cs.alwaysWrong.length !== ALWAYS_WRONG_COUNT) {
    out.warn(file, `alwaysWrong has ${cs.alwaysWrong.length} items (expected ${ALWAYS_WRONG_COUNT})`);
  }
}

function checkSyllabus(file: string, syl: Syllabus, out: Collector): void {
  const domains = new Set(syl.domains.map((d) => d.id));
  for (const t of syl.tasks) {
    if (!domains.has(t.domain)) out.error(file, `task ${t.id} has unknown domain ${t.domain}`);
  }
}

export function validateContent(raw: RawContent): ValidationResult {
  const out = new Collector();
  const syllabus = parseWith<Syllabus>(SyllabusSchema, raw.syllabus.file, raw.syllabus.data, out);
  const traps = parseWith<Traps>(TrapsSchema, raw.traps.file, raw.traps.data, out);
  const flashcards = parseWith<Flashcards>(FlashcardsSchema, raw.flashcards.file, raw.flashcards.data, out);
  const cheatsheet = parseWith<Cheatsheet>(CheatsheetSchema, raw.cheatsheet.file, raw.cheatsheet.data, out);
  const questionFiles: RawFileOf<QuestionFile>[] = [];
  for (const f of raw.questionFiles) {
    const data = parseWith<QuestionFile>(QuestionFileSchema, f.file, f.data, out);
    if (data) questionFiles.push({ file: f.file, data });
  }

  const refs: RefsFull = {
    tasks: new Set(syllabus?.tasks.map((t) => t.id)),
    traps: new Set(traps?.traps.map((t) => t.id)),
    sources: new Set(Object.keys(syllabus?.sources ?? {})),
    domains: new Set(syllabus?.domains.map((d) => d.id)),
    taskDomain: new Map(syllabus?.tasks.map((t) => [t.id, t.domain])),
  };

  if (syllabus) checkSyllabus(raw.syllabus.file, syllabus, out);
  // Without the syllabus or traps, reference checks would flag everything; the parse error is enough.
  if (syllabus && traps) {
    checkQuestionFiles(questionFiles, refs, out);
    if (flashcards) checkFlashcards(raw.flashcards.file, flashcards, syllabus, refs, out);
    if (cheatsheet) checkCheatsheet(raw.cheatsheet.file, cheatsheet, refs, out);
  }

  const coverage = buildCoverage(
    syllabus,
    questionFiles.map((f) => f.data),
    flashcards,
  );
  return { errors: out.errors, warnings: out.warnings, coverage };
}
