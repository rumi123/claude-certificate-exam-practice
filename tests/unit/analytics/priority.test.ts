import { describe, expect, it } from 'vitest';
import { statusFor, taskMastery } from '@/lib/analytics/mastery';
import { studyPriority } from '@/lib/analytics/priority';
import { history } from '../../fixtures/history';

const tasks = [
  { id: '1.1', title: 'A', domainId: 'D1' },
  { id: '1.2', title: 'B', domainId: 'D1' },
  { id: '1.3', title: 'C', domainId: 'D1' },
];
const weights = { D1: 0.27 };

function run(results: Record<string, number[]>, blind = {}, traps = {}) {
  const items = Object.entries(results).flatMap(([id, r]) => history(id, r));
  const res = Object.fromEntries(tasks.map((t) => [t.id, taskMastery(items, t.id)]));
  const answers = Object.fromEntries(Object.entries(results).map(([id, r]) => [id, r.length]));
  return studyPriority(tasks, res, weights, blind, answers, traps);
}

describe('studyPriority', () => {
  it('ranks the lower-accuracy task higher', () => {
    const out = run({ '1.1': [1, 1, 1, 0], '1.2': [0, 0, 0, 0] });
    expect(out[0].taskId).toBe('1.2');
  });

  it('leaves out Strong tasks', () => {
    const out = run({ '1.1': [1, 1, 1, 1], '1.2': [0, 0, 0], '1.3': [1, 0, 0] });
    expect(out.map((e) => e.taskId)).not.toContain('1.1');
    expect(statusFor(1, 4)).toBe('strong');
  });

  it('caps the list at 8', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `1.${i}`,
      title: 't',
      domainId: 'D1',
    }));
    expect(studyPriority(many, {}, weights, {}, {}, {})).toHaveLength(8);
  });

  it('builds the reason strings', () => {
    const out = run(
      { '1.2': [1, 0, 0, 0, 0, 0, 0, 0, 0] },
      { '1.2': 2 },
      { '1.2': 'Wrong config layer' },
    );
    const e = out.find((x) => x.taskId === '1.2')!;
    expect(e.reasons).toEqual([
      'Accuracy 20% over last 9 answers',
      '2 blind spots',
      'Most-picked trap here: Wrong config layer',
    ]);
  });
});
