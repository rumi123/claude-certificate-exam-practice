import { parseInlineCode } from '@/lib/format/inline-code';

export function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInlineCode(text).map((seg, i) =>
        seg.kind === 'code' ? (
          <code key={i} className="code-inline">
            {seg.text}
          </code>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
