import { loadContent } from '../lib/content/load';
import {
  lessonGaps,
  measureQuality,
  qualityGates,
  type QualityMetrics,
  type QualityQuestion,
} from '../lib/content/quality';
import { LessonFileSchema, MockFileSchema, QuestionFileSchema, SyllabusSchema } from '../lib/content/schemas';
import { seededRng } from '../lib/rng';

const SEED = 1;

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function show(id: string, v: number | null): string {
  if (v === null) return 'n/a';
  return [
    'correctLongest',
    'correctShortest',
    'absoluteRule',
    'solver',
    'topAskShare',
    'constraintStems',
  ].includes(id)
    ? pct(v)
    : Number.isInteger(v)
      ? String(v)
      : v.toFixed(3);
}

function details(m: QualityMetrics): string[] {
  const out: string[] = [];
  if (m.tellWords.length) out.push(`  tell words: ${m.tellWords.join(', ')}`);
  if (m.alwaysWrongFamilies.length)
    out.push(`  always-wrong families: ${m.alwaysWrongFamilies.join(', ')}`);
  for (const p of m.answerPatterns.filter((x) => x.count > 2)) {
    out.push(`  answer pattern "${p.name}": ${p.count} questions (${p.ids.join(', ')})`);
  }
  return out;
}

// Prints one table and returns true when every gate passes.
function report(title: string, questions: QualityQuestion[], gated: boolean): boolean {
  const m = measureQuality(questions, seededRng(SEED));
  const gates = qualityGates(m);
  console.log(`\n${title} (${m.questions} questions, ${m.singles} single-answer)`);
  const rows = gates.map((g) => [
    g.label,
    show(g.id, g.value),
    show(g.id, g.limit),
    gated ? (g.pass ? 'PASS' : 'FAIL') : g.pass ? 'ok' : 'over',
  ]);
  const head = ['Gate', 'Value', 'Limit', gated ? 'Result' : 'Status'];
  const all = [head, ...rows];
  const w = head.map((_, c) => Math.max(...all.map((r) => r[c].length)));
  for (const r of all) {
    console.log(r.map((cell, c) => (c === 0 ? cell.padEnd(w[c]) : cell.padStart(w[c]))).join('  '));
  }
  for (const line of details(m)) console.log(line);
  return gates.every((g) => g.pass);
}

function lessonIds(raw: ReturnType<typeof loadContent>): Set<string> {
  return new Set(
    raw.lessonFiles.flatMap((f) => LessonFileSchema.parse(f.data).lessons.map((l) => l.questionId)),
  );
}

// Report only: never changes the exit code.
function reportLessons(raw: ReturnType<typeof loadContent>, ids: Set<string>): void {
  const syllabus = SyllabusSchema.parse(raw.syllabus.data);
  const taskDomain = new Map(syllabus.tasks.map((t) => [t.id, t.domain]));
  const questions = raw.questionFiles.flatMap((f) =>
    QuestionFileSchema.parse(f.data).questions.map((q) => ({
      id: q.id,
      domain: taskDomain.get(q.primaryTask) ?? 'unknown',
    })),
  );
  const gaps = lessonGaps(questions, ids);
  console.log('');
  for (const d of Object.keys(gaps).sort()) {
    console.log(`Lessons ${d}: ${gaps[d].missing} of ${gaps[d].total} questions without a lesson`);
  }
}

function main(): number {
  const raw = loadContent();
  const practice: QualityQuestion[] = [];
  for (const f of raw.questionFiles) {
    const data = QuestionFileSchema.parse(f.data);
    for (const q of data.questions) practice.push({ ...q, scenario: data.scenario });
  }
  report('Practice bank (report only)', practice, false);
  const ids = lessonIds(raw);
  reportLessons(raw, ids);

  let failed = 0;
  for (const f of raw.mockFiles) {
    const data = MockFileSchema.parse(f.data);
    const ok = report(`Mock paper ${data.pool}`, data.questions, true);
    const missing = data.questions.filter((q) => !ids.has(q.id)).length;
    const draft = data.status === 'draft' ? ' (draft)' : '';
    console.log(
      `Lessons ${data.pool}: ${missing} of ${data.questions.length} questions without a lesson${draft}`,
    );
    if (!ok) failed++;
  }
  console.log(
    failed ? `\ncontent:quality FAILED (${failed} paper(s) miss a gate)` : '\ncontent:quality OK',
  );
  return failed ? 1 : 0;
}

try {
  process.exitCode = main();
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
}
