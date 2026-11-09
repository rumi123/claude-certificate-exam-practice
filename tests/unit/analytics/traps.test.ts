import { describe, expect, it } from 'vitest';
import { trapProfile } from '@/lib/analytics/traps';
import { item } from '../../fixtures/history';

const opts = (...ids: (string | null)[]) => ids.map((trapId, i) => ({ key: 'abcd'[i], trapId }));

describe('trapProfile', () => {
  it('ranks by rate and ignores traps exposed fewer than 3 times', () => {
    const items = [
      // X: picked 3 of 3
      ...[1, 2, 3].map((n) =>
        item({
          questionId: `X${n}`,
          isCorrect: false,
          selectedKeys: ['b'],
          optionTraps: opts(null, 'X'),
        }),
      ),
      // Y: picked 1 of 4
      ...[1, 2, 3, 4].map((n) =>
        item({
          questionId: `Y${n}`,
          isCorrect: n !== 1,
          selectedKeys: n === 1 ? ['b'] : ['a'],
          optionTraps: opts(null, 'Y'),
        }),
      ),
      // Z: exposed twice only
      ...[1, 2].map((n) =>
        item({ questionId: `Z${n}`, selectedKeys: ['b'], optionTraps: opts(null, 'Z') }),
      ),
    ];
    const rows = trapProfile(items);
    expect(rows.map((r) => r.trapId)).toEqual(['X', 'Y']);
    expect(rows[0]).toMatchObject({ exposed: 3, picked: 3, rate: 1 });
    expect(rows[1]).toMatchObject({
      exposed: 4,
      picked: 1,
      rate: 0.25,
      wrongExampleQuestionId: 'Y1',
    });
  });

  it('counts a trap once per item even when two options share it', () => {
    const items = [1, 2, 3].map((n) =>
      item({ questionId: `Q${n}`, selectedKeys: ['b', 'c'], optionTraps: opts(null, 'X', 'X') }),
    );
    expect(trapProfile(items)[0]).toMatchObject({ exposed: 3, picked: 3 });
  });
});
