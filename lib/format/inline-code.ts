export type Segment = { kind: 'text' | 'code'; text: string };

export function parseInlineCode(s: string): Segment[] {
  const parts = s.split('`');
  const segments: Segment[] = [];
  const pairedEnd = parts.length % 2 === 0 ? parts.length - 1 : parts.length;
  for (let i = 0; i < parts.length; i++) {
    const paired = i < pairedEnd;
    let text = parts[i];
    let kind: Segment['kind'] = paired && i % 2 === 1 ? 'code' : 'text';
    if (!paired && i % 2 === 1) {
      // Unmatched trailing backtick stays in the text.
      text = `\`${text}`;
      kind = 'text';
    }
    if (text === '') continue;
    const last = segments[segments.length - 1];
    if (kind === 'text' && last?.kind === 'text') last.text += text;
    else segments.push({ kind, text });
  }
  return segments;
}
