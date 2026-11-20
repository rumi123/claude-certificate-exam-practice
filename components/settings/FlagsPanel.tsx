'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { Flag } from 'lucide-react';
import { Button, Card, EmptyState, InlineText } from '@/components/ui';
import { resolveFlag } from '@/app/settings/actions';
import type { OpenFlag } from '@/lib/db/queries/flags';

function day(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function toMarkdown(flags: OpenFlag[]): string {
  return flags
    .map(
      (f) => `## ${f.questionId}\n\n${f.stem}\n\nNote: ${f.note}\n\nFlagged: ${day(f.createdAt)}\n`,
    )
    .join('\n');
}

export default function FlagsPanel({ flags, stamp }: { flags: OpenFlag[]; stamp: string }) {
  const [pending, startTransition] = useTransition();

  function download() {
    const url = URL.createObjectURL(new Blob([toMarkdown(flags)], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `flags-${stamp}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (flags.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState testId="no-flags" icon={Flag} title="No open flags" />
      </div>
    );
  }
  return (
    <div className="mt-4">
      <Button type="button" variant="secondary" onClick={download}>
        Export as markdown
      </Button>
      <ul className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
        {flags.map((f) => (
          <Card as="li" key={f.id} data-testid="flag-row">
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/questions/${f.questionId}`}
                className="whitespace-nowrap font-mono font-semibold text-accent hover:underline"
              >
                {f.questionId}
              </Link>
              <span className="text-sm text-muted">{day(f.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              <InlineText text={f.stem} />
            </p>
            <p className="mt-1 text-sm">{f.note}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2"
              disabled={pending}
              onClick={() => startTransition(async () => void (await resolveFlag(f.id)))}
            >
              Resolve
            </Button>
          </Card>
        ))}
      </ul>
    </div>
  );
}
