import { describe, expect, it } from 'vitest';
import { loadContent, type RawContent } from '@/lib/content/load';
import { validateContent } from '@/lib/content/validate';
import type { QuestionFile } from '@/lib/content/schemas';

const real = loadContent('content');

function clone(): RawContent {
  return structuredClone(real);
}

function s1(raw: RawContent): QuestionFile {
  return raw.questionFiles.find((f) => f.file.includes('s1-'))!.data as QuestionFile;
}

function errorsOf(raw: RawContent): string[] {
  return validateContent(raw).errors.map((e) => e.message);
}

function expectError(raw: RawContent, fragment: string): void {
  expect(errorsOf(raw).some((m) => m.includes(fragment))).toBe(true);
}

describe('content validator', () => {
  it('accepts the real content with 0 errors', () => {
    const res = validateContent(real);
    expect(res.errors).toEqual([]);
    expect(res.coverage.questions).toBe(150);
  });

  it('rejects a wrong option count', () => {
    const raw = clone();
    s1(raw).questions[0].options.pop();
    expectError(raw, 'needs 4 options');
  });

  it('rejects two correct options in a single question', () => {
    const raw = clone();
    const wrong = s1(raw).questions[0].options.find((o) => !o.correct)!;
    wrong.correct = true;
    wrong.trap = null;
    expectError(raw, 'needs 1 correct options');
  });

  it('rejects a wrong option without a trap', () => {
    const raw = clone();
    s1(raw).questions[0].options.find((o) => !o.correct)!.trap = null;
    expectError(raw, 'is wrong but has no trap');
  });

  it('rejects a correct option with a trap', () => {
    const raw = clone();
    s1(raw).questions[0].options.find((o) => o.correct)!.trap = 'PROMPT_FOR_GUARANTEE';
    expectError(raw, 'is correct but has trap');
  });

  it('rejects an explanation that names an option letter', () => {
    const raw = clone();
    const opt = s1(raw).questions[0].options[1];
    opt.explanation =
      'Option B is wrong because a prompt rule cannot guarantee the order of tool calls.';
    expectError(raw, 'refers to an option letter');
  });

  it('rejects an unknown task', () => {
    const raw = clone();
    s1(raw).questions[0].primaryTask = '6.1';
    expectError(raw, 'unknown task 6.1');
  });

  it('rejects a duplicate id', () => {
    const raw = clone();
    const qs = s1(raw).questions;
    qs[1].id = qs[0].id;
    expectError(raw, 'duplicate id');
  });

  it('rejects secondary tasks containing the primary task', () => {
    const raw = clone();
    const q = s1(raw).questions[0];
    q.secondaryTasks = [q.primaryTask];
    expectError(raw, 'secondaryTasks contains the primary task');
  });

  it('rejects a multi stem without (Select 2.)', () => {
    const raw = clone();
    const q = s1(raw).questions.find((x) => x.type === 'multi')!;
    q.stem = q.stem.replace('(Select 2.)', '').trim();
    expectError(raw, '(Select 2.)');
  });

  it('rejects an unknown key', () => {
    const raw = clone();
    (s1(raw).questions[0] as unknown as Record<string, unknown>).extra = 1;
    expectError(raw, 'Unrecognized key');
  });

  it('rejects an unknown trap id once', () => {
    const raw = clone();
    s1(raw).questions[0].options[1].trap = 'NOPE';
    const res = validateContent(raw);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].id).toBe('S1-001');
    expect(res.errors[0].message).toContain('NOPE');
  });
});
