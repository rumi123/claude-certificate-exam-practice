import type { ZodType } from 'zod';
import { isAnthropicUrl, isHttpUrl } from './source-url';
import { buildCoverage, type Coverage } from './coverage';
import type { RawContent } from './load';
import {
  CheatsheetSchema,
  FlashcardsSchema,
  LessonFileSchema,
  MockFileSchema,
  QuestionFileSchema,
  SyllabusSchema,
  TrapsSchema,
  type Cheatsheet,
  type Flashcards,
  type Lesson,
  type LessonFile,
  type MockFile,
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
  MOCK_DIFFICULTY_TARGET,
  MOCK_DIFFICULTY_TOLERANCE,
  MOCK_DOMAIN_MIX,
  MOCK_DOMAIN_TOLERANCE,
  MOCK_MAX_BEYOND_GUIDE,
  MOCK_MAX_NONEXISTENT,
  MOCK_MULTI,
  MOCK_PER_SCENARIO,
  MOCK_QUESTIONS,
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

function parseWith<T>(
  schema: ZodType<T>,
  file: string,
  data: unknown,
  out: Collector,
  idAt: (data: unknown, path: PropertyKey[]) => string | undefined = questionIdAt,
): T | null {
  const res = schema.safeParse(data);
  if (res.success) return res.data;
  for (const issue of res.error.issues) {
    const where = issue.path.length ? `${issue.path.join('.')}: ` : '';
    const id = idAt(data, issue.path);
    out.error(file, `${where}${issue.message}`, id);
  }
  return null;
}

function questionIdAt(data: unknown, path: PropertyKey[]): string | undefined {
  if (path[0] !== 'questions' || typeof path[1] !== 'number') return undefined;
  const q = (data as { questions?: { id?: unknown }[] })?.questions?.[path[1]];
  return typeof q?.id === 'string' ? q.id : undefined;
}

function lessonIdAt(data: unknown, path: PropertyKey[]): string | undefined {
  if (path[0] !== 'lessons' || typeof path[1] !== 'number') return undefined;
  const l = (data as { lessons?: { questionId?: unknown }[] })?.lessons?.[path[1]];
  return typeof l?.questionId === 'string' ? l.questionId : undefined;
}

function checkTrap(file: string, trap: string, refs: Refs, out: Collector, where: string, id?: string): void {
  if (!refs.traps.has(trap)) out.error(file, `${where} uses unknown trap "${trap}"`, id);
}

function checkQuestion(
  file: string,
  scenario: string | null,
  q: Question,
  refs: Refs,
  out: Collector,
): number {
  const err = (m: string) => out.error(file, m, q.id);
  const multi = q.type === 'multi';
  if (scenario !== null && !q.id.startsWith(`${scenario}-`)) err(`id must start with "${scenario}-"`);
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

interface Seen {
  ids: Map<string, string>;
  stems: Map<string, string>;
}

function noteUnique(seen: Seen, file: string, q: Question, out: Collector): void {
  const first = seen.ids.get(q.id);
  if (first) out.error(file, `duplicate id (also in ${first})`, q.id);
  else seen.ids.set(q.id, file);
  const stem = normalise(q.stem);
  const same = seen.stems.get(stem);
  if (same) out.error(file, `stem duplicates ${same}`, q.id);
  else seen.stems.set(stem, q.id);
}

function checkQuestionFiles(
  files: RawFileOf<QuestionFile>[],
  refs: RefsFull,
  out: Collector,
): Seen {
  const seen: Seen = { ids: new Map(), stems: new Map() };
  for (const f of files) {
    let longest = 0;
    for (const q of f.data.questions) {
      noteUnique(seen, f.file, q, out);
      longest += checkQuestion(f.file, f.data.scenario, q, refs, out);
    }
    checkFileWarnings(f, longest, refs, out);
  }
  return seen;
}

const MOCK_ID = /^M(\d+)-(S\d)-\d{3}$/;

function checkMockIds(f: RawFileOf<MockFile>, q: MockFile['questions'][number], out: Collector): void {
  const m = MOCK_ID.exec(q.id);
  if (!m) {
    out.error(f.file, 'id must look like M1-S3-014', q.id);
    return;
  }
  if (`mock-${m[1]}` !== f.data.pool) out.error(f.file, `id paper number does not match pool ${f.data.pool}`, q.id);
  if (m[2] !== q.scenario) out.error(f.file, `id scenario ${m[2]} does not match scenario ${q.scenario}`, q.id);
  if (!f.data.scenarios.includes(q.scenario)) {
    out.error(f.file, `scenario ${q.scenario} is not listed in the file's scenarios`, q.id);
  }
}

function countBy<T>(xs: T[], key: (x: T) => string | number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of xs) out[key(x)] = (out[key(x)] ?? 0) + 1;
  return out;
}

function checkMockWarnings(f: RawFileOf<MockFile>, refs: RefsFull, out: Collector): void {
  const { file, data } = f;
  const qs = data.questions;
  if (qs.length !== MOCK_QUESTIONS) out.warn(file, `has ${qs.length} questions (expected ${MOCK_QUESTIONS})`);
  const perScenario = countBy(qs, (q) => q.scenario);
  for (const s of data.scenarios) {
    const n = perScenario[s] ?? 0;
    if (n !== MOCK_PER_SCENARIO) out.warn(file, `scenario ${s} has ${n} questions (expected ${MOCK_PER_SCENARIO})`);
  }
  const multi = qs.filter((q) => q.type === 'multi').length;
  if (multi !== MOCK_MULTI) out.warn(file, `has ${multi} multi questions (expected ${MOCK_MULTI})`);
  const mix = countBy(qs, (q) => refs.taskDomain.get(q.primaryTask) ?? 'unknown');
  for (const [d, want] of Object.entries(MOCK_DOMAIN_MIX)) {
    const got = mix[d] ?? 0;
    if (Math.abs(got - want) > MOCK_DOMAIN_TOLERANCE) out.warn(file, `domain ${d} has ${got} questions (target ${want} +/- ${MOCK_DOMAIN_TOLERANCE})`);
  }
  const diff = countBy(qs, (q) => q.difficulty);
  for (const [level, want] of Object.entries(MOCK_DIFFICULTY_TARGET)) {
    const got = diff[level] ?? 0;
    if (Math.abs(got - want) > MOCK_DIFFICULTY_TOLERANCE) {
      out.warn(file, `difficulty ${level} has ${got} questions (target about ${want})`);
    }
  }
  const wrongTraps = qs.flatMap((q) => q.options.filter((o) => !o.correct && o.trap !== null).map((o) => o.trap as string));
  const trapCount = countBy(wrongTraps, (t) => t);
  const distinct = Object.keys(trapCount).length;
  if (distinct < MIN_DISTINCT_TRAPS) out.warn(file, `only ${distinct} distinct traps (want ${MIN_DISTINCT_TRAPS}+)`);
  for (const [trap, n] of Object.entries(trapCount)) {
    if (n > MAX_TRAP_SHARE * wrongTraps.length) out.warn(file, `trap ${trap} is on ${n}/${wrongTraps.length} wrong options`);
  }
}

function checkMockFiles(
  files: RawFileOf<MockFile>[],
  seen: Seen,
  refs: RefsFull,
  out: Collector,
): void {
  for (const f of files) {
    for (const q of f.data.questions) {
      noteUnique(seen, f.file, q, out);
      checkMockIds(f, q, out);
      checkQuestion(f.file, null, q, refs, out);
    }
    const qs = f.data.questions;
    if (qs.filter((q) => q.beyondGuide).length > MOCK_MAX_BEYOND_GUIDE) {
      out.error(f.file, `more than ${MOCK_MAX_BEYOND_GUIDE} beyondGuide questions`);
    }
    const fake = qs.reduce(
      (n, q) => n + q.options.filter((o) => !o.correct && o.trap === 'NONEXISTENT_FEATURE').length,
      0,
    );
    if (fake > MOCK_MAX_NONEXISTENT) {
      out.error(f.file, `${fake} NONEXISTENT_FEATURE wrong options (max ${MOCK_MAX_NONEXISTENT})`);
    }
    checkMockWarnings(f, refs, out);
  }
}

interface LessonTarget {
  domain: string;
  options: { id: string; correct: boolean }[];
}

function lessonTexts(l: Lesson): string[] {
  return [
    l.explanation,
    ...Object.values(l.options).flatMap((o) => [o.reasoning, o.tempting ?? '']),
    ...l.concept,
    ...(l.conceptTable ? [...l.conceptTable.headers, ...l.conceptTable.rows.flat()] : []),
    ...l.stemSignals.flatMap((s) => [s.phrase, s.meaning]),
    ...l.lookFor,
    ...l.eliminate.map((e) => e.reason),
    l.rule,
  ];
}

function isRealDate(s: string): boolean {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function checkLesson(
  file: string,
  fileDomain: string,
  l: Lesson,
  target: LessonTarget | undefined,
  out: Collector,
): void {
  const err = (m: string) => out.error(file, m, l.questionId);
  if (!target) {
    err('lesson is for a question that is not in the practice files');
    return;
  }
  if (target.domain !== fileDomain) err(`question is in ${target.domain}, file is ${fileDomain}`);
  const ids = target.options.map((o) => o.id);
  const have = Object.keys(l.options);
  const missing = ids.filter((id) => !have.includes(id));
  const extra = have.filter((id) => !ids.includes(id));
  if (missing.length) err(`options is missing ${missing.join(', ')}`);
  if (extra.length) err(`options has extra ${extra.join(', ')}`);

  const correct = new Set(target.options.filter((o) => o.correct).map((o) => o.id));
  const named = new Set<string>();
  for (const e of l.eliminate) {
    if (correct.has(e.option)) err(`eliminate names correct option ${e.option}`);
    if (named.has(e.option)) err(`eliminate names option ${e.option} twice`);
    named.add(e.option);
  }
  const unnamed = ids.filter((id) => !correct.has(id) && !named.has(id));
  if (unnamed.length) err(`eliminate leaves out wrong option ${unnamed.join(', ')}`);

  if (lessonTexts(l).some((t) => LETTER_REF.test(t))) err('refers to an option letter or position');
  if (!l.sources.some((s) => s.kind === 'exam-guide' || s.kind === 'anthropic-docs')) {
    err('needs a source of kind exam-guide or anthropic-docs');
  }
  for (const s of l.sources) {
    if (!isAnthropicUrl(s.url)) err(`source url ${s.url} is not an Anthropic page`);
  }
  if (!isRealDate(l.verifiedAt)) err(`verifiedAt ${l.verifiedAt} is not a real date`);
}

function checkLessonFiles(
  files: RawFileOf<LessonFile>[],
  questions: Map<string, LessonTarget>,
  out: Collector,
): void {
  const seen = new Map<string, string>();
  for (const f of files) {
    for (const l of f.data.lessons) {
      const first = seen.get(l.questionId);
      if (first) out.error(f.file, `second lesson for this question (also in ${first})`, l.questionId);
      else seen.set(l.questionId, f.file);
      checkLesson(f.file, f.data.domain, l, questions.get(l.questionId), out);
    }
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
    if (t.lessonUrl && !isAnthropicUrl(t.lessonUrl)) {
      out.error(file, `task ${t.id} lessonUrl ${t.lessonUrl} is not an Anthropic page`);
    }
  }
  for (const [key, s] of Object.entries(syl.sources)) {
    if (isHttpUrl(s.url) && !isAnthropicUrl(s.url)) {
      out.error(file, `source "${key}" url ${s.url} is not an Anthropic page`);
    }
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

  const mockFiles: RawFileOf<MockFile>[] = [];
  for (const f of raw.mockFiles) {
    const data = parseWith<MockFile>(MockFileSchema, f.file, f.data, out);
    if (data) mockFiles.push({ file: f.file, data });
  }

  const lessonFiles: RawFileOf<LessonFile>[] = [];
  for (const f of raw.lessonFiles) {
    const data = parseWith<LessonFile>(LessonFileSchema, f.file, f.data, out, lessonIdAt);
    if (data) lessonFiles.push({ file: f.file, data });
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
    const seen = checkQuestionFiles(questionFiles, refs, out);
    checkMockFiles(mockFiles, seen, refs, out);
    const targets = new Map<string, LessonTarget>();
    for (const f of questionFiles) {
      for (const q of f.data.questions) {
        targets.set(q.id, {
          domain: refs.taskDomain.get(q.primaryTask) ?? 'unknown',
          options: q.options.map((o) => ({ id: o.id, correct: o.correct })),
        });
      }
    }
    checkLessonFiles(lessonFiles, targets, out);
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
