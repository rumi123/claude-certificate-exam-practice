// Per-question wording report: which §9a checks each question fails, and why the
// option-text-only solver picks what it picks. Report only; it never writes files.
// Usage: npm run content:report:aicert -- [D1..D5] [--summary] [--explain ID ...]
import { loadContent } from '../lib/content/load';
import { QuestionFileSchema } from '../lib/content/schemas';
import {
  measureQuality,
  qualityGates,
  type QualityOption,
  type QualityQuestion,
} from '../lib/content/quality';
import { seededRng } from '../lib/rng';

const ABSOLUTE =
  /\b(more|never|once|again|second|since|whenever|most|raise|every|always|all|same|full|tell)\b/i;
const CONSTRAINT =
  /\b(while|without|however|but|although|though|must|constraint|budget|latency|cost|trade-?off)\b/i;
const BANNED = [
  'must hold every time',
  'the steps never change',
  'nobody knows in advance',
  'without either affecting the other',
  'no other files are involved',
  'a retry would fail in the same way',
];
const TELL = ['more', 'never', 'once', 'second', 'again', 'since', 'whenever', 'raise', 'every'];
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
const PATTERNS: [string, RegExp][] = [
  ['stop_reason loop', /stop_reason/i],
  ['fork_session', /fork_session/i],
  ['--resume', /--resume/i],
  ['structured error fields', /errorCategory|structured error/i],
  ['path-scoped .claude/rules', /\.claude\/rules/i],
  [
    'per-file + cross-file pass',
    /(each file|per-file|one file).*(pass)|cross-file|integration pass/i,
  ],
  ['restrict tools to role', /(limit|restrict|give|only).{0,40}(tools)/i],
];

type Opt = QualityOption;
type Q = QualityQuestion & { domain: string };

const W = (s: string) => s.split(/\s+/).filter(Boolean).length;
const tok = (s: string) => new Set(s.toLowerCase().match(/[a-z_-]{3,}/g) ?? []);
const wrx = (w: string) => new RegExp(`\\b${w}\\b`, 'i');
const famHit = (name: string, rx: RegExp | null, o: Opt) =>
  rx ? rx.test(o.text) : o.trap === 'NONEXISTENT_FEATURE';

const raw = loadContent(process.env.CONTENT_DIR ?? 'content-aicert');
const qs: Q[] = [];
for (const f of raw.questionFiles) {
  const d = QuestionFileSchema.parse(f.data);
  for (const q of d.questions) qs.push({ ...q, scenario: d.scenario, domain: q.id.split('-')[1] });
}

// Bank-wide: which tell words and families are currently "always wrong".
function countBy(match: (o: Opt) => boolean) {
  let wrong = 0,
    correct = 0;
  const wrongIds: string[] = [],
    correctIds: string[] = [];
  for (const q of qs)
    for (const o of q.options)
      if (match(o)) {
        if (o.correct) {
          correct++;
          correctIds.push(q.id);
        } else {
          wrong++;
          wrongIds.push(q.id);
        }
      }
  return { wrong, correct, wrongIds: [...new Set(wrongIds)], correctIds: [...new Set(correctIds)] };
}
const tellStats = TELL.map((w) => ({ w, ...countBy((o) => wrx(w).test(o.text)) }));
const famStats = FAMILIES.map(([n, rx]) => ({ n, ...countBy((o) => famHit(n, rx, o)) }));
const badTell = new Set(tellStats.filter((t) => t.wrong >= 5 && t.correct === 0).map((t) => t.w));
const badFam = new Set(famStats.filter((f) => f.wrong >= 4 && f.correct === 0).map((f) => f.n));
const patStats = PATTERNS.map(([n, rx]) => ({
  n,
  ids: qs.filter((q) => q.options.some((o) => o.correct && rx.test(o.text))).map((q) => q.id),
}));

// Solver: leave-one-scenario-out naive Bayes over option words (same as lib/content/quality.ts).
function fit(train: Q[]) {
  const m = { c: new Map<string, number>(), w: new Map<string, number>(), nc: 0, nw: 0 };
  for (const q of train)
    for (const o of q.options) {
      const t = o.correct ? m.c : m.w;
      for (const k of tok(o.text)) t.set(k, (t.get(k) ?? 0) + 1);
      if (o.correct) m.nc++;
      else m.nw++;
    }
  return m;
}
const scen = [...new Set(qs.map((q) => q.scenario))];
const models = new Map(scen.map((s) => [s, fit(qs.filter((q) => q.scenario !== s))]));
function score(text: string, m: ReturnType<typeof fit>) {
  let s = 0;
  for (const k of tok(text))
    s +=
      Math.log(((m.c.get(k) ?? 0) + 0.5) / (m.nc + 1)) -
      Math.log(((m.w.get(k) ?? 0) + 0.5) / (m.nw + 1));
  return s;
}

const args = process.argv.slice(2);
const domain = args.find((a) => /^D\d$/.test(a));
const summaryOnly = args.includes('--summary');

const explainIdx = args.indexOf('--explain');
if (explainIdx >= 0) {
  for (const id of args.slice(explainIdx + 1)) {
    const q = qs.find((x) => x.id === id);
    if (!q) {
      console.log(`${id}: not found`);
      continue;
    }
    const mod = models.get(q.scenario)!;
    console.log(
      `\n${id} (solver trained on the other scenarios; higher score = looks more like a correct option)`,
    );
    q.options.forEach((o, i) => {
      const parts = [...tok(o.text)].map(
        (k) =>
          [
            k,
            Math.log(((mod.c.get(k) ?? 0) + 0.5) / (mod.nc + 1)) -
              Math.log(((mod.w.get(k) ?? 0) + 0.5) / (mod.nw + 1)),
          ] as [string, number],
      );
      const total = parts.reduce((a, [, v]) => a + v, 0);
      parts.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
      console.log(
        `  option ${i + 1} ${o.correct ? 'CORRECT' : 'wrong  '} score ${total.toFixed(1)}  (${W(o.text)} words)  top words: ${parts
          .slice(0, 8)
          .map(([k, v]) => `${k}${v >= 0 ? '+' : ''}${v.toFixed(1)}`)
          .join(' ')}`,
      );
    });
  }
  process.exit(0);
}

const m = measureQuality(qs, seededRng(1));
console.log(`BANK (${qs.length} questions)`);
for (const g of qualityGates(m)) {
  const v =
    g.value === null ? 'n/a' : Number.isInteger(g.value) ? String(g.value) : g.value.toFixed(3);
  console.log(`  ${g.pass ? 'ok  ' : 'OVER'} ${g.label}: ${v} (limit ${g.limit})`);
}
console.log('  tell words now always-wrong:', [...badTell].join(', ') || 'none');
for (const t of tellStats)
  if (t.wrong + t.correct) console.log(`    "${t.w}": wrong ${t.wrong}, correct ${t.correct}`);
console.log('  families now always-wrong:', [...badFam].join('; ') || 'none');
for (const f of famStats)
  if (f.wrong + f.correct)
    console.log(
      `    ${f.n}: wrong ${f.wrong} [${f.wrongIds.join(' ')}], correct ${f.correct} [${f.correctIds.join(' ')}]`,
    );
console.log('  answer patterns used as correct answer (limit 2 each):');
for (const p of patStats)
  if (p.ids.length)
    console.log(
      `    ${p.ids.length > 2 ? 'OVER' : 'ok  '} ${p.n}: ${p.ids.length} [${p.ids.join(' ')}]`,
    );
const byDom = new Map<string, { n: number; hit: number }>();
for (const q of qs) {
  if (q.options.length !== 4 || q.options.filter((o) => o.correct).length !== 1) continue;
  const sc = q.options.map((o) => score(o.text, models.get(q.scenario)!));
  const best = Math.max(...sc);
  const ties = sc.filter((x) => x === best).length;
  const hit = sc[q.options.findIndex((o) => o.correct)] === best ? 1 / ties : 0;
  const d = byDom.get(q.domain) ?? { n: 0, hit: 0 };
  d.n++;
  d.hit += hit;
  byDom.set(q.domain, d);
}
console.log(
  '  solver hit rate by domain (singles):',
  [...byDom]
    .sort()
    .map(([d, v]) => `${d} ${((100 * v.hit) / v.n).toFixed(0)}%`)
    .join(', '),
);
if (summaryOnly) process.exit(0);

console.log('\nPER QUESTION (only failing checks are listed)');
for (const q of qs) {
  if (domain && q.domain !== domain) continue;
  const flags: string[] = [];
  const single = q.options.length === 4 && q.options.filter((o) => o.correct).length === 1;
  const lens = q.options.map((o) => W(o.text));
  const sw = W(q.stem.replace(/\(Select 2\.\)/, ''));
  if (sw < 40 || sw > 110) flags.push(`stem is ${sw} words (want 40-110)`);
  if (!CONSTRAINT.test(q.stem)) flags.push('stem has no constraint/trade-off word');
  for (const b of BANNED) if (q.stem.toLowerCase().includes(b)) flags.push(`banned phrase "${b}"`);
  if (single) {
    const sc = q.options.map((o) => score(o.text, models.get(q.scenario)!));
    const ci = q.options.findIndex((o) => o.correct);
    const bestWrong = Math.max(...sc.filter((_, i) => i !== ci));
    if (sc[ci] >= bestWrong)
      flags.push(
        `SOLVER picks the correct option from wording alone (margin +${(sc[ci] - bestWrong).toFixed(1)})`,
      );
    const max = Math.max(...lens),
      min = Math.min(...lens);
    if (lens[ci] === max && lens.filter((l) => l === max).length === 1)
      flags.push(`correct option is the longest (${lens.join('/')} words)`);
    if (lens[ci] === min && lens.filter((l) => l === min).length === 1)
      flags.push(`correct option is the shortest (${lens.join('/')} words)`);
    const ct = tok(q.options[ci].text);
    const ov = Math.max(
      ...q.options
        .filter((o) => !o.correct)
        .map((o) => {
          const t = tok(o.text);
          const i = [...ct].filter((x) => t.has(x)).length;
          return i / new Set([...ct, ...t]).size;
        }),
    );
    if (ov < 0.18)
      flags.push(
        `closest distractor shares little wording with the correct option (overlap ${ov.toFixed(2)}, want >= 0.18)`,
      );
    if (
      !ABSOLUTE.test(q.options[ci].text) &&
      q.options.some((o) => !o.correct && ABSOLUTE.test(o.text))
    )
      flags.push('absolute words (more/never/always/all/every...) appear only in wrong options');
  }
  if (Math.max(...lens) / Math.min(...lens) > 1.5)
    flags.push(`option lengths uneven (${lens.join('/')} words)`);
  q.options.forEach((o, i) => {
    if (o.correct) return;
    for (const w of badTell)
      if (wrx(w).test(o.text)) flags.push(`wrong option ${i + 1} uses tell word "${w}"`);
    for (const [n, rx] of FAMILIES)
      if (badFam.has(n) && famHit(n, rx, o))
        flags.push(`wrong option ${i + 1} is in always-wrong family ${n}`);
  });
  for (const p of patStats)
    if (p.ids.length > 2 && p.ids.includes(q.id))
      flags.push(`correct answer reuses over-used pattern "${p.n}" (${p.ids.length} in bank)`);
  console.log(`${q.id}${flags.length ? '' : '  ok'}`);
  for (const f of flags) console.log(`   - ${f}`);
}
