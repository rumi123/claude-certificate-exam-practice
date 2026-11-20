// How easily a question set can be solved from its wording (authoring guide section 9a).
// Pure functions: no file or database access.
import { shuffle, type Rng } from '../rng';

export interface QualityOption {
  text: string;
  correct: boolean;
  trap: string | null;
}

export interface QualityQuestion {
  id: string;
  scenario: string;
  type: 'single' | 'multi';
  stem: string;
  options: QualityOption[];
}

export interface AnswerPatternHit {
  name: string;
  count: number;
  ids: string[];
}

export interface QualityMetrics {
  questions: number;
  singles: number;
  correctLongest: number;
  correctShortest: number;
  absoluteRule: number;
  // Null when fewer than 2 scenarios are present.
  solver: number | null;
  closestDistractor: number;
  topAskShare: number;
  constraintStems: number;
  artifactStems: number;
  bannedPhrases: number;
  tellWords: string[];
  alwaysWrongFamilies: string[];
  answerPatterns: AnswerPatternHit[];
}

export interface Gate {
  id: string;
  label: string;
  value: number | null;
  limit: number;
  pass: boolean;
}

export const SOLVER_RUNS = 40;

const ABSOLUTE_WORDS =
  /\b(more|never|once|again|second|since|whenever|most|raise|every|always|all|same|full|tell)\b/i;
const CONSTRAINT_WORDS =
  /\b(while|without|however|but|although|though|must|constraint|budget|latency|cost|trade-?off)\b/i;
const BANNED_PHRASES = [
  'must hold every time',
  'the steps never change',
  'nobody knows in advance',
  'without either affecting the other',
  'no other files are involved',
  'a retry would fail in the same way',
];
const TELL_WORDS = ['more', 'never', 'once', 'second', 'again', 'since', 'whenever', 'raise', 'every'];

const FAMILIES: [string, RegExp | null][] = [
  ['temperature', /\btemperature\b/i],
  ['max_tokens / bigger context', /max_tokens|larger context|bigger context/i],
  ['self-rated confidence', /confidence|sure of|percent sure|\d+% sure/i],
  ['sentiment', /sentiment|frustration score/i],
  ['classifier / routing layer', /classifier|routing layer|router/i],
  ['capitals/bold/top of prompt', /capital|in bold|bold,|top of the (system )?prompt/i],
  [
    '"tell it in the prompt"',
    /(add|put|tell|instruct|ask).{0,40}(system prompt|the prompt|instruction|claude\.md)/i,
  ],
  [
    'raise limit / retry more',
    /\b(raise|increase|extend)\b.{0,30}(limit|cap|timeout|retry|iteration)|retry .{0,20}(times|until)/i,
  ],
  [
    'same session reviews itself',
    /(same session|its own|own (review|report|change|fix|result)).{0,40}review|review.{0,30}(its|their) own/i,
  ],
  ['fake flag/feature', null],
];

const ANSWER_PATTERNS: [string, RegExp][] = [
  ['stop_reason loop', /stop_reason/i],
  ['fork_session', /fork_session/i],
  ['--resume + name changed files', /--resume/i],
  ['structured error fields', /errorCategory|structured error/i],
  ['path-scoped .claude/rules', /\.claude\/rules/i],
  [
    'split per-file + cross-file pass',
    /(each file|per-file|one file).*(pass)|cross-file|integration pass/i,
  ],
  ['restrict tools to role', /(limit|restrict|give|only).{0,40}(tools)/i],
];

const wordCount = (s: string): number => s.split(/\s+/).filter(Boolean).length;
const tokens = (s: string): Set<string> => new Set(s.toLowerCase().match(/[a-z_-]{3,}/g) ?? []);
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function isSingle(q: QualityQuestion): boolean {
  return q.options.length === 4 && q.options.filter((o) => o.correct).length === 1;
}

// Share of singles where the correct option has the extreme word count; ties share the credit.
function extremeShare(singles: QualityQuestion[], pick: (xs: number[]) => number): number {
  return mean(
    singles.map((q) => {
      const lens = q.options.map((o) => wordCount(o.text));
      const target = pick(lens);
      const correct = lens[q.options.findIndex((o) => o.correct)];
      return correct === target ? 1 / lens.filter((l) => l === target).length : 0;
    }),
  );
}

function absoluteRuleScore(singles: QualityQuestion[]): number {
  return mean(
    singles.map((q) => {
      const kept = q.options.filter((o) => !ABSOLUTE_WORDS.test(o.text));
      const pool = kept.length ? kept : q.options;
      return pool.filter((o) => o.correct).length / pool.length;
    }),
  );
}

interface NaiveBayes {
  correct: Map<string, number>;
  wrong: Map<string, number>;
  nCorrect: number;
  nWrong: number;
}

function fit(train: QualityQuestion[]): NaiveBayes {
  const m: NaiveBayes = { correct: new Map(), wrong: new Map(), nCorrect: 0, nWrong: 0 };
  for (const q of train) {
    for (const o of q.options) {
      const counts = o.correct ? m.correct : m.wrong;
      for (const tok of tokens(o.text)) counts.set(tok, (counts.get(tok) ?? 0) + 1);
      if (o.correct) m.nCorrect++;
      else m.nWrong++;
    }
  }
  return m;
}

function score(text: string, m: NaiveBayes): number {
  let sum = 0;
  for (const tok of tokens(text)) {
    sum +=
      Math.log(((m.correct.get(tok) ?? 0) + 0.5) / (m.nCorrect + 1)) -
      Math.log(((m.wrong.get(tok) ?? 0) + 0.5) / (m.nWrong + 1));
  }
  return sum;
}

// Option text only, trained on the other scenarios; the mean of SOLVER_RUNS random tie-breaks.
function solverScore(questions: QualityQuestion[], rng: Rng): number | null {
  const scenarios = [...new Set(questions.map((q) => q.scenario))].sort();
  if (scenarios.length < 2) return null;
  const tests: { options: QualityOption[]; scores: number[] }[] = [];
  for (const s of scenarios) {
    const model = fit(questions.filter((q) => q.scenario !== s));
    for (const q of questions) {
      if (q.scenario !== s || !isSingle(q)) continue;
      tests.push({ options: q.options, scores: q.options.map((o) => score(o.text, model)) });
    }
  }
  if (tests.length === 0) return null;
  const runs: number[] = [];
  for (let r = 0; r < SOLVER_RUNS; r++) {
    let ok = 0;
    for (const t of tests) {
      const order = shuffle(
        t.options.map((_, i) => i),
        rng,
      );
      order.sort((a, b) => t.scores[b] - t.scores[a]);
      if (t.options[order[0]].correct) ok++;
    }
    runs.push(ok / tests.length);
  }
  return mean(runs);
}

function closestDistractor(singles: QualityQuestion[]): number {
  return mean(
    singles.map((q) => {
      const correct = tokens(q.options.find((o) => o.correct)!.text);
      let best = 0;
      for (const o of q.options) {
        if (o.correct) continue;
        const other = tokens(o.text);
        const inter = [...correct].filter((t) => other.has(t)).length;
        const union = new Set([...correct, ...other]).size;
        best = Math.max(best, inter / Math.max(1, union));
      }
      return best;
    }),
  );
}

function askOpening(stem: string): string {
  const sentences = stem.replace(/\(Select 2\.\)/g, '').trim().split(/(?<=[.?!])\s+/);
  return (sentences[sentences.length - 1] ?? '').toLowerCase().split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
}

function topAskShare(questions: QualityQuestion[]): number {
  if (questions.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const q of questions) {
    const k = askOpening(q.stem);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const top = [...counts.values()].sort((a, b) => b - a).slice(0, 3);
  return top.reduce((a, b) => a + b, 0) / questions.length;
}

function hasArtifact(stem: string): boolean {
  for (const m of stem.matchAll(/`([^`]+)`/g)) {
    const span = m[1];
    if (/[ {=]/.test(span) || span.startsWith('--')) return true;
  }
  return false;
}

function wordRegex(word: string): RegExp {
  return new RegExp(`\\b${word}\\b`, 'i');
}

// Names whose pattern appears on `minWrong`+ wrong options and on no correct option.
function alwaysWrong(
  questions: QualityQuestion[],
  names: string[],
  matches: (name: string, o: QualityOption) => boolean,
  minWrong: number,
): string[] {
  return names.filter((name) => {
    let wrong = 0;
    let correct = 0;
    for (const q of questions) {
      for (const o of q.options) {
        if (!matches(name, o)) continue;
        if (o.correct) correct++;
        else wrong++;
      }
    }
    return wrong >= minWrong && correct === 0;
  });
}

export function measureQuality(questions: QualityQuestion[], rng: Rng): QualityMetrics {
  const singles = questions.filter(isSingle);
  const stems = questions.map((q) => q.stem);
  const tellRx = new Map(TELL_WORDS.map((w) => [w, wordRegex(w)]));
  const familyRx = new Map(FAMILIES);
  const answerPatterns = ANSWER_PATTERNS.map(([name, rx]) => {
    const ids = questions
      .filter((q) => q.options.some((o) => o.correct && rx.test(o.text)))
      .map((q) => q.id);
    return { name, count: ids.length, ids };
  });
  return {
    questions: questions.length,
    singles: singles.length,
    correctLongest: extremeShare(singles, (l) => Math.max(...l)),
    correctShortest: extremeShare(singles, (l) => Math.min(...l)),
    absoluteRule: absoluteRuleScore(singles),
    solver: solverScore(questions, rng),
    closestDistractor: closestDistractor(singles),
    topAskShare: topAskShare(questions),
    constraintStems: questions.length
      ? stems.filter((s) => CONSTRAINT_WORDS.test(s)).length / questions.length
      : 0,
    artifactStems: stems.filter(hasArtifact).length,
    bannedPhrases: stems.filter((s) =>
      BANNED_PHRASES.some((p) => s.toLowerCase().includes(p)),
    ).length,
    tellWords: alwaysWrong(questions, TELL_WORDS, (w, o) => tellRx.get(w)!.test(o.text), 5),
    alwaysWrongFamilies: alwaysWrong(
      questions,
      FAMILIES.map(([name]) => name),
      (name, o) => {
        const rx = familyRx.get(name);
        return rx ? rx.test(o.text) : o.trap === 'NONEXISTENT_FEATURE';
      },
      4,
    ),
    answerPatterns,
  };
}

export function qualityGates(m: QualityMetrics): Gate[] {
  const max = (id: string, label: string, value: number | null, limit: number): Gate => ({
    id,
    label: `${label} (max)`,
    value,
    limit,
    pass: value === null || value <= limit,
  });
  const min = (id: string, label: string, value: number, limit: number): Gate => ({
    id,
    label: `${label} (min)`,
    value,
    limit,
    pass: value >= limit,
  });
  return [
    max('correctLongest', 'Correct option is the longest', m.correctLongest, 0.4),
    max('correctShortest', 'Correct option is the shortest', m.correctShortest, 0.3),
    max('absoluteRule', 'Score from dropping absolute-word options', m.absoluteRule, 0.4),
    max('solver', 'Option-text-only solver score', m.solver, 0.4),
    min('closestDistractor', 'Closest distractor word overlap', m.closestDistractor, 0.18),
    max('topAskShare', 'Top three ask openings', m.topAskShare, 0.5),
    min('constraintStems', 'Stems with a constraint word', m.constraintStems, 0.5),
    min('artifactStems', 'Stems quoting a config line or command', m.artifactStems, 6),
    max('bannedPhrases', 'Stems with a banned phrase', m.bannedPhrases, 0),
    max('tellWords', 'Tell words always on wrong options', m.tellWords.length, 0),
    max('alwaysWrongFamilies', 'Always-wrong families', m.alwaysWrongFamilies.length, 0),
    max(
      'answerPatterns',
      'Most-used answer pattern, in questions',
      Math.max(0, ...m.answerPatterns.map((p) => p.count)),
      2,
    ),
  ];
}

// Questions without a lesson, per domain (D1..D5); only domains that have questions appear.
export function lessonGaps(
  questions: { id: string; domain: string }[],
  lessonIds: Set<string>,
): Record<string, { total: number; missing: number }> {
  const out: Record<string, { total: number; missing: number }> = {};
  for (const q of questions) {
    const row = (out[q.domain] ??= { total: 0, missing: 0 });
    row.total++;
    if (!lessonIds.has(q.id)) row.missing++;
  }
  return out;
}
