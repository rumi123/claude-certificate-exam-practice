import { describe, expect, it } from 'vitest';
import { isAnthropicUrl, isHttpUrl } from '@/lib/content/source-url';

describe('isAnthropicUrl', () => {
  it.each([
    'https://academy.claude.com/courses/x',
    'https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons',
    'https://code.claude.com/docs/en/hooks',
    'https://docs.claude.com/en/docs/overview',
    'https://support.claude.com/en/articles/1',
    'https://claude.com/blog/x',
    'https://www.anthropic.com/engineering/building-effective-agents',
    'https://anthropic.com/news',
    'https://claude.ai/login',
    'https://anthropic.skilljar.com/claude-certified-architect-foundations-access-request',
    'https://github.com/anthropics/claude-code',
    'https://modelcontextprotocol.io/specification/2025-06-18/server/tools',
  ])('allows %s', (url) => {
    expect(isAnthropicUrl(url)).toBe(true);
  });

  it.each([
    'https://jc-aiwiki.pages.dev/claude-ai/official-exam-guide',
    'https://dev.to/zintaen/post',
    'https://github.com/dnacenta/claude-certified-architect',
    'https://github.com/anthropicsfake/repo',
    'https://notanthropic.com/x',
    'https://anthropic.com.evil.example/x',
    'https://claudecertificationguide.com/learn',
    'https://example.com/?u=https://anthropic.com',
    'not a url',
    'ftp://anthropic.com/x',
  ])('rejects %s', (url) => {
    expect(isAnthropicUrl(url)).toBe(false);
  });
});

describe('isHttpUrl', () => {
  it('tells web URLs from local paths', () => {
    expect(isHttpUrl('https://x.test')).toBe(true);
    expect(isHttpUrl('docs/ccaf-exam-research.md')).toBe(false);
  });
});
