import { describe, expect, it } from 'vitest';
import { parseInlineCode } from '@/lib/format/inline-code';

describe('parseInlineCode', () => {
  it('returns plain text as one segment', () => {
    expect(parseInlineCode('plain')).toEqual([{ kind: 'text', text: 'plain' }]);
  });
  it('splits text, code, text', () => {
    expect(parseInlineCode('use `foo` here')).toEqual([
      { kind: 'text', text: 'use ' },
      { kind: 'code', text: 'foo' },
      { kind: 'text', text: ' here' },
    ]);
  });
  it('handles several pairs and drops empty segments', () => {
    expect(parseInlineCode('`a` and `b`')).toEqual([
      { kind: 'code', text: 'a' },
      { kind: 'text', text: ' and ' },
      { kind: 'code', text: 'b' },
    ]);
  });
  it('keeps an unmatched trailing backtick in the text', () => {
    expect(parseInlineCode('tick ` alone')).toEqual([{ kind: 'text', text: 'tick ` alone' }]);
  });
  it('keeps an unmatched backtick after a pair', () => {
    expect(parseInlineCode('`a` then ` x')).toEqual([
      { kind: 'code', text: 'a' },
      { kind: 'text', text: ' then ` x' },
    ]);
  });
  it('returns [] for an empty string', () => {
    expect(parseInlineCode('')).toEqual([]);
  });
});
