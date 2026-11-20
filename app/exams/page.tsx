import { ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { Button, Card, Chip, EmptyState } from '@/components/ui';
import { getSessionHistory } from '@/lib/db/queries/history';

export const dynamic = 'force-dynamic';

const TABS = [
  { id: 'all', label: 'All', href: '/exams' },
  { id: 'test', label: 'Test', href: '/exams?mode=test' },
  { id: 'study', label: 'Study', href: '/exams?mode=study' },
] as const;

const TAB = 'rounded-full px-3 py-1 text-sm font-medium';
const TAB_ON = 'bg-accent text-accent-fg';
const TAB_OFF = 'text-fg hover:bg-surface';

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, '0')}s`;
}

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode: raw } = await searchParams;
  const mode = raw === 'test' || raw === 'study' ? raw : undefined;
  const rows = getSessionHistory(mode);
  const active = mode ?? 'all';
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Exams</h1>
      <div
        className="flex w-fit max-w-full flex-wrap gap-1 rounded-full bg-surface-2 p-1"
        role="tablist"
        aria-label="Exam mode"
      >
        {TABS.map((x) => (
          <Link
            key={x.id}
            href={x.href}
            role="tab"
            aria-selected={x.id === active}
            className={`${TAB} ${x.id === active ? TAB_ON : TAB_OFF}`}
          >
            {x.label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No finished exams yet"
          action={
            <Button variant="primary" href="/practice">
              Start practice
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/practice/${r.id}/summary`} data-testid="exam-row" className="block">
                <Card className="flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-surface-2">
                  <span className="text-sm text-muted">
                    {new Date(r.finishedAt).toLocaleString()}
                  </span>
                  <span className="min-w-0 font-medium">{r.source}</span>
                  <Chip tone="accent">{r.mode === 'test' ? 'Test' : 'Study'}</Chip>
                  {r.status === 'abandoned' && <Chip tone="weak">Abandoned</Chip>}
                  <span className="ml-auto text-sm font-semibold">
                    {r.correct} / {r.total} (
                    {r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0}%)
                  </span>
                  <span className="text-sm text-muted">{formatDuration(r.timeUsedMs)}</span>
                  {r.marked > 0 && <span className="text-sm">{r.marked} marked</span>}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
