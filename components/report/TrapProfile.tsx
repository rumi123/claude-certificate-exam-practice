import type { Report } from '@/lib/report/build-report';
import { Chip } from '@/components/ui';
import { pct } from './format';

export default function TrapProfile({ traps }: { traps: Report['traps'] }) {
  return (
    <ol className="space-y-3">
      {traps.map((t) => (
        <li key={t.trapId} data-testid="trap-row" className="rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <Chip tone="close">
              <span data-testid="trap-name">{t.name}</span>
            </Chip>
            <span className="text-sm text-muted">
              picked {t.picked} of {t.exposed} ({pct(t.rate)})
            </span>
          </div>
          <p className="mt-1 text-sm">{t.principle}</p>
          {t.wrongExampleQuestionId && (
            <p className="mt-1 text-xs text-muted">
              Example you got wrong: {t.wrongExampleQuestionId}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
