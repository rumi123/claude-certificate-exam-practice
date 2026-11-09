import { describe, expect, it } from 'vitest';
import { plural } from '@/lib/format/plural';

describe('plural', () => {
  it('uses the singular for 1', () => {
    expect(plural(1, 'question')).toBe('1 question');
  });
  it('uses the plural for 0 and 2+', () => {
    expect(plural(0, 'question')).toBe('0 questions');
    expect(plural(3, 'question')).toBe('3 questions');
  });
  it('accepts an irregular plural', () => {
    expect(plural(2, 'box', 'boxes')).toBe('2 boxes');
  });
});
