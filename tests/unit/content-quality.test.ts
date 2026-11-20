import { describe, expect, it } from 'vitest';
import {
  measureQuality,
  qualityGates,
  type QualityMetrics,
  type QualityQuestion,
} from '@/lib/content/quality';
import { seededRng } from '@/lib/rng';

// `opts` lists the option texts; the first is correct unless `correctAt` says otherwise.
function q(
  id: string,
  opts: string[],
  extra: Partial<QualityQuestion> & { correctAt?: number; traps?: (string | null)[] } = {},
): QualityQuestion {
  const { correctAt = 0, traps, ...rest } = extra;
  return {
    id,
    scenario: 'S1',
    type: 'single',
    stem: 'A plain stem. What is the best fix?',
    options: opts.map((text, i) => ({
      text,
      correct: i === correctAt,
      trap: i === correctAt ? null : (traps?.[i] ?? 'SYMPTOM_PATCH'),
    })),
    ...rest,
  };
}

const measure = (qs: QualityQuestion[], seed = 1) => measureQuality(qs, seededRng(seed));
const gate = (m: QualityMetrics, id: string) => qualityGates(m).find((g) => g.id === id)!;

describe('length gates', () => {
  it('gives tied extremes a fractional credit', () => {
    const qs = [
      q('a', ['one two three four five', 'one two', 'one two three', 'one']),
      q('b', ['one two three four', 'one two three four', 'one', 'one two']),
    ];
    const m = measure(qs);
    expect(m.singles).toBe(2);
    expect(m.correctLongest).toBeCloseTo(0.75);
    expect(m.correctShortest).toBe(0);
    expect(gate(m, 'correctLongest').pass).toBe(false);
    expect(gate(m, 'correctShortest').pass).toBe(true);
  });

  it('measures the shortest correct option', () => {
    const m = measure([q('a', ['one', 'one two', 'one two three', 'one two three four'])]);
    expect(m.correctShortest).toBe(1);
    expect(gate(m, 'correctShortest').pass).toBe(false);
  });

  it('ignores multi-answer questions', () => {
    const multi = q('m', ['a b', 'c', 'd', 'e', 'f'], { type: 'multi' });
    multi.options[1].correct = true;
    expect(measure([multi]).singles).toBe(0);
  });
});

describe('absolute-word rule', () => {
  it('drops flagged options and averages the correct share of the rest', () => {
    const m = measure([
      q('a', ['restrict the tool', 'never retry', 'always retry', 'raise the cap']),
      q('b', ['restrict the tool', 'ask again', 'every time', 'once more']),
    ]);
    expect(m.absoluteRule).toBe(1);
  });

  it('falls back to every option when all are flagged', () => {
    const m = measure([q('a', ['never one', 'always two', 'every three', 'once four'])]);
    expect(m.absoluteRule).toBeCloseTo(0.25);
  });

  it('fails the gate above 0.40', () => {
    const m = measure([
      q('a', ['restrict the tool', 'never retry', 'always retry', 'raise the cap']),
    ]);
    expect(gate(m, 'absoluteRule').pass).toBe(false);
  });
});

describe('solver', () => {
  const leaky = (scenario: string, n: number) =>
    Array.from({ length: n }, (_, i) =>
      q(
        `${scenario}${i}`,
        ['enforce gate hooks', 'tune prompt wording', 'raise limit budget', 'add classifier layer'],
        {
          scenario,
        },
      ),
    );

  it('is null and passes with fewer than 2 scenarios', () => {
    const m = measure(leaky('S1', 5));
    expect(m.solver).toBeNull();
    expect(gate(m, 'solver')).toMatchObject({ value: null, pass: true });
  });

  it('solves a bank whose correct options share wording', () => {
    const m = measure([...leaky('S1', 4), ...leaky('S2', 4)]);
    expect(m.solver).toBeGreaterThan(0.95);
    expect(gate(m, 'solver').pass).toBe(false);
  });

  it('is near chance when the wording carries no signal', () => {
    const same = (scenario: string) =>
      Array.from({ length: 30 }, (_, i) =>
        q(`${scenario}${i}`, ['alpha beta', 'alpha beta', 'alpha beta', 'alpha beta'], {
          scenario,
        }),
      );
    const m = measure([...same('S1'), ...same('S2')]);
    expect(m.solver).toBeGreaterThan(0.15);
    expect(m.solver).toBeLessThan(0.4);
    expect(gate(m, 'solver').pass).toBe(true);
  });

  it('gives the same score for the same seed', () => {
    const qs = [...leaky('S1', 3), ...leaky('S2', 3)];
    qs.push(q('tie', ['alpha', 'alpha', 'alpha', 'alpha'], { scenario: 'S1' }));
    expect(measure(qs, 7).solver).toBe(measure(qs, 7).solver);
  });
});

describe('closest distractor', () => {
  it('takes the highest Jaccard overlap among wrong options', () => {
    const m = measure([q('a', ['alpha beta gamma', 'alpha beta delta', 'zzz yyy', 'qqq rrr'])]);
    expect(m.closestDistractor).toBeCloseTo(0.5);
    expect(gate(m, 'closestDistractor').pass).toBe(true);
  });

  it('fails the gate below 0.18', () => {
    const m = measure([q('a', ['alpha beta gamma', 'zzz yyy', 'qqq rrr', 'mmm nnn'])]);
    expect(m.closestDistractor).toBe(0);
    expect(gate(m, 'closestDistractor').pass).toBe(false);
  });
});

describe('stem measures', () => {
  const stem = (s: string) => q('x', ['a', 'b', 'c', 'd'], { stem: s });

  it('computes the share of the three most common ask openings', () => {
    const qs = [
      stem('Setup one. What is the most effective fix?'),
      stem('Setup two. What is the most effective step?'),
      stem('Setup three. What is the most effective way? (Select 2.)'),
      stem('Setup four. Which design should you choose?'),
      stem('Setup five. How should the team respond?'),
      stem('Setup six. Why does this happen here?'),
      stem('Setup seven. Where should this rule live?'),
      stem('Setup eight. Who should own it?'),
    ];
    const m = measure(qs);
    expect(m.topAskShare).toBeCloseTo(5 / 8);
    expect(gate(m, 'topAskShare').pass).toBe(false);
  });

  it('counts stems with a constraint word', () => {
    const m = measure([
      stem('It must stay cheap. Which one?'),
      stem('A trade-off exists. Which one?'),
      stem('Plain words only. Which one?'),
      stem('Plain words again. Which one?'),
    ]);
    expect(m.constraintStems).toBeCloseTo(0.5);
    expect(gate(m, 'constraintStems').pass).toBe(true);
  });

  it('counts stems that quote a config line, command or log value', () => {
    const m = measure([
      stem('Run `claude -p` in CI.'),
      stem('The flag `--resume` is set.'),
      stem('The log shows `{"stop_reason":"tool_use"}`.'),
      stem('The setting `mode=auto` applies.'),
      stem('The tool `get_customer` runs.'),
      stem('No code here.'),
    ]);
    expect(m.artifactStems).toBe(4);
    expect(gate(m, 'artifactStems').pass).toBe(false);
  });

  it('counts stems with a banned phrase', () => {
    const m = measure([
      stem('The order Must Hold Every Time here.'),
      stem('Nobody knows in advance what comes next.'),
      stem('Fine stem.'),
    ]);
    expect(m.bannedPhrases).toBe(2);
    expect(gate(m, 'bannedPhrases').pass).toBe(false);
  });
});

describe('tell words', () => {
  const wrongOnly = (word: string, n: number) =>
    Array.from({ length: n }, (_, i) =>
      q(`t${i}`, ['restrict the tools', `${word} again x`, 'plain b', 'plain c']),
    );

  it('lists a word on 5 or more wrong options and no correct option', () => {
    const m = measure(wrongOnly('whenever', 5));
    expect(m.tellWords).toEqual(expect.arrayContaining(['whenever', 'again']));
    expect(gate(m, 'tellWords').pass).toBe(false);
  });

  it('does not list a word below 5 wrong options', () => {
    expect(measure(wrongOnly('whenever', 4)).tellWords).toEqual([]);
  });

  it('does not list a word that a correct option also uses', () => {
    const qs = [...wrongOnly('never', 5), q('c', ['never skip it', 'b', 'c', 'd'])];
    expect(measure(qs).tellWords).not.toContain('never');
  });

  it('matches whole words only', () => {
    const qs = Array.from({ length: 6 }, (_, i) => q(`w${i}`, ['a', 'moreover', 'onceler', 'c']));
    expect(measure(qs).tellWords).toEqual([]);
  });
});

describe('always-wrong families', () => {
  const four = (text: string, trap: string | null = 'SYMPTOM_PATCH') =>
    Array.from({ length: 4 }, (_, i) =>
      q(`f${i}`, ['restrict the tools', text, 'b b', 'c c'], { traps: [null, trap] }),
    );

  it('lists a regex family with 4 wrong options and no correct one', () => {
    const m = measure(four('lower the temperature'));
    expect(m.alwaysWrongFamilies).toEqual(['temperature']);
    expect(gate(m, 'alwaysWrongFamilies').pass).toBe(false);
  });

  it('lists the invented-feature trap family', () => {
    const m = measure(four('use the magic flag', 'NONEXISTENT_FEATURE'));
    expect(m.alwaysWrongFamilies).toEqual(['fake flag/feature']);
  });

  it('skips a family that is correct somewhere or rarer than 4', () => {
    const correctToo = [
      ...four('lower the temperature'),
      q('c', ['lower the temperature', 'b', 'c', 'd']),
    ];
    expect(measure(correctToo).alwaysWrongFamilies).toEqual([]);
    expect(measure(four('lower the temperature').slice(0, 3)).alwaysWrongFamilies).toEqual([]);
  });
});

describe('answer patterns', () => {
  const pattern = (n: number) =>
    Array.from({ length: n }, (_, i) => q(`p${i}`, ['loop on stop_reason', 'b', 'c', 'd']));

  it('counts questions whose correct option matches a pattern', () => {
    const m = measure(pattern(3));
    expect(m.answerPatterns.find((p) => p.name === 'stop_reason loop')).toMatchObject({
      count: 3,
      ids: ['p0', 'p1', 'p2'],
    });
    expect(gate(m, 'answerPatterns')).toMatchObject({ value: 3, limit: 2, pass: false });
  });

  it('allows a pattern twice and ignores wrong options', () => {
    const wrong = q('w', ['a', 'loop on stop_reason', 'c', 'd']);
    const m = measure([...pattern(2), wrong]);
    expect(gate(m, 'answerPatterns').pass).toBe(true);
  });
});

describe('qualityGates', () => {
  const good: QualityMetrics = {
    questions: 60,
    singles: 48,
    correctLongest: 0.4,
    correctShortest: 0.3,
    absoluteRule: 0.4,
    solver: 0.4,
    closestDistractor: 0.18,
    topAskShare: 0.5,
    constraintStems: 0.5,
    artifactStems: 6,
    bannedPhrases: 0,
    tellWords: [],
    alwaysWrongFamilies: [],
    answerPatterns: [{ name: 'x', count: 2, ids: ['a', 'b'] }],
  };

  it('returns all 12 gates, each passing at its limit', () => {
    const gates = qualityGates(good);
    expect(gates.map((g) => g.id)).toEqual([
      'correctLongest',
      'correctShortest',
      'absoluteRule',
      'solver',
      'closestDistractor',
      'topAskShare',
      'constraintStems',
      'artifactStems',
      'bannedPhrases',
      'tellWords',
      'alwaysWrongFamilies',
      'answerPatterns',
    ]);
    for (const g of gates)
      expect(g).toEqual({
        id: g.id,
        label: expect.any(String),
        value: g.value,
        limit: g.limit,
        pass: true,
      });
  });

  it.each([
    ['correctLongest', { correctLongest: 0.41 }],
    ['correctShortest', { correctShortest: 0.31 }],
    ['absoluteRule', { absoluteRule: 0.41 }],
    ['solver', { solver: 0.41 }],
    ['closestDistractor', { closestDistractor: 0.17 }],
    ['topAskShare', { topAskShare: 0.51 }],
    ['constraintStems', { constraintStems: 0.49 }],
    ['artifactStems', { artifactStems: 5 }],
    ['bannedPhrases', { bannedPhrases: 1 }],
    ['tellWords', { tellWords: ['never'] }],
    ['alwaysWrongFamilies', { alwaysWrongFamilies: ['temperature'] }],
    ['answerPatterns', { answerPatterns: [{ name: 'x', count: 3, ids: [] }] }],
  ])('fails %s just past its limit', (id, patch) => {
    expect(gate({ ...good, ...patch }, id).pass).toBe(false);
  });
});
