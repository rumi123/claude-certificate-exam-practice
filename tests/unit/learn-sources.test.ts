import { describe, expect, it } from 'vitest';
import { groupTaskSources } from '@/lib/db/queries/learn';

const DOCS = 'https://platform.claude.com/docs/en/a';
const ACADEMY = 'https://academy.claude.com/courses/b';
const GUIDE = 'https://example.com/guide';

describe('groupTaskSources', () => {
  it('dedupes by URL, counts lessons, keeps the shortest title and hides exam-guide', () => {
    const out = groupTaskSources([
      {
        sources: [
          { kind: 'exam-guide', title: 'Guide', url: GUIDE },
          { kind: 'skilljar', title: 'Course B', url: ACADEMY },
        ],
      },
      {
        sources: [
          { kind: 'anthropic-docs', title: 'Doc A (plan mode)', url: DOCS },
          { kind: 'skilljar', title: 'Course B', url: ACADEMY },
        ],
      },
      { sources: [{ kind: 'anthropic-docs', title: 'Doc A', url: DOCS }] },
      { sources: [{ kind: 'anthropic-docs', title: 'Doc A', url: DOCS }] },
    ]);
    expect(out).toEqual([
      { kind: 'anthropic-docs', title: 'Doc A', url: DOCS, lessons: 3 },
      { kind: 'skilljar', title: 'Course B', url: ACADEMY, lessons: 2 },
    ]);
  });

  it('counts a URL once per lesson', () => {
    const out = groupTaskSources([
      {
        sources: [
          { kind: 'anthropic-docs', title: 'Doc A', url: DOCS },
          { kind: 'anthropic-docs', title: 'Doc A again', url: DOCS },
        ],
      },
    ]);
    expect(out).toEqual([{ kind: 'anthropic-docs', title: 'Doc A', url: DOCS, lessons: 1 }]);
  });
});
