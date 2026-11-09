import { describe, expect, it } from 'vitest';
import { score } from '@/lib/engine/scoring';

describe('score', () => {
  it('scores single answers', () => {
    expect(score(['a'], ['a'])).toEqual({ isCorrect: true, correctSelected: 1 });
  });
  it('ignores order for multi answers', () => {
    expect(score(['a', 'c'], ['c', 'a'])).toEqual({ isCorrect: true, correctSelected: 2 });
  });
  it('gives partial count but not correct', () => {
    expect(score(['a', 'c'], ['a', 'b'])).toEqual({ isCorrect: false, correctSelected: 1 });
  });
  it('handles empty selection', () => {
    expect(score(['a'], [])).toEqual({ isCorrect: false, correctSelected: 0 });
  });
  it('is not correct when extra keys are selected', () => {
    expect(score(['a'], ['a', 'b'])).toEqual({ isCorrect: false, correctSelected: 1 });
  });
});
