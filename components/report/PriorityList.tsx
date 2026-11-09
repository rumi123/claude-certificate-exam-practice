import Link from 'next/link';
import { CircleAlert, CircleCheck, CircleHelp, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import DrillButton from '@/components/DrillButton';
import { IconTile } from '@/components/ui';
import type { PriorityEntry } from '@/lib/analytics/priority';
import type { Status } from '@/lib/analytics/types';
import { taskAnchor } from '@/lib/content/research';
import StatusBadge from './StatusBadge';
import { STATUS_TONE, pct } from './format';

const LINK = 'text-accent hover:underline';
const STATUS_ICON: Record<Status, LucideIcon> = {
  strong: CircleCheck,
  ok: CircleAlert,
  weak: TriangleAlert,
  untested: CircleHelp,
};

export default function PriorityList({
  entries,
  domainNames,
  lessonUrls,
}: {
  entries: PriorityEntry[];
  domainNames: Record<string, string>;
  lessonUrls: Record<string, string | null>;
}) {
  return (
    <ol className="space-y-3">
      {entries.map((e) => (
        <li
          key={e.taskId}
          data-testid="priority-item"
          data-task={e.taskId}
          className="flex items-start gap-3 rounded-lg border border-border p-3"
        >
          <IconTile icon={STATUS_ICON[e.status]} tone={STATUS_TONE[e.status]} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-semibold">
                <span className="whitespace-nowrap">{e.taskId}</span> {e.title}
              </span>
              <StatusBadge status={e.status} />
            </div>
            <p className="text-sm text-muted">
              {domainNames[e.domainId] ?? e.domainId} · mastery {pct(e.mastery)} · n {e.n}
            </p>
            {e.reasons.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-sm">
                {e.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
              <Link href={`/research#${taskAnchor(e.taskId)}`} className={LINK}>
                Read
              </Link>
              {lessonUrls[e.taskId] && (
                <a href={lessonUrls[e.taskId]!} target="_blank" rel="noreferrer" className={LINK}>
                  Lesson
                </a>
              )}
              <DrillButton taskId={e.taskId} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
