import { ChevronRight } from 'lucide-react';
import type { Report } from '@/lib/report/build-report';
import { Meter } from '@/components/ui';
import StatusBadge from './StatusBadge';
import { STATUS_TONE, dateOf, pct } from './format';

export default function DomainBars({
  domains,
  withTasks = true,
}: {
  domains: Report['domains'];
  withTasks?: boolean;
}) {
  return (
    <ul className="space-y-4">
      {domains.map((d) => {
        const weight = Math.round(d.weight * 100);
        const row = (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-sm font-medium">
              {withTasks && (
                <ChevronRight
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 transition-transform group-open:rotate-90"
                />
              )}
              <span className="text-muted">{d.id}</span>
              <span className="min-w-0">{d.name}</span>
              <span className="shrink-0 text-xs font-normal text-muted">· {weight}%</span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <Meter
                value={d.mastery}
                tone={STATUS_TONE[d.status]}
                label={`${d.name}: mastery ${pct(d.mastery)}, exam weight ${weight}%`}
              />
              <span className="w-10 shrink-0 text-right text-sm">{pct(d.mastery)}</span>
              <StatusBadge status={d.status} />
            </div>
          </div>
        );
        return (
          <li key={d.id} data-testid="domain-bar" data-domain={d.id}>
            {withTasks ? (
              <details className="group">
                <summary className="flex cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  {row}
                </summary>
                <div className="overflow-x-auto">
                  <table className="mt-2 w-full text-sm">
                    <tbody>
                      {d.tasks.map((t) => (
                        <tr key={t.id} className="border-t border-border">
                          <td className="px-2 py-1">{t.id}</td>
                          <td className="px-2 py-1">{t.title}</td>
                          <td className="px-2 py-1">
                            <StatusBadge status={t.status} />
                          </td>
                          <td className="px-2 py-1">{pct(t.mastery)}</td>
                          <td className="px-2 py-1">n {t.n}</td>
                          <td className="px-2 py-1">{dateOf(t.lastSeenAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : (
              <div className="flex">{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
