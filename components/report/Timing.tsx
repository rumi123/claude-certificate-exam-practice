import { Chip } from '@/components/ui';
import type { Report } from '@/lib/report/build-report';

const TARGET_S = 120;

function secs(x: number | null): string {
  return x === null ? '-' : `${Math.round(x)} s`;
}

export default function Timing({
  timing,
  domainNames,
}: {
  timing: Report['timing'];
  domainNames: Record<string, string>;
}) {
  return (
    <div className="text-sm">
      <p>
        Overall: mean {secs(timing.overall.meanS)}, median {secs(timing.overall.medianS)} (target{' '}
        {TARGET_S} s per question)
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-2 py-1 text-left font-semibold">Domain</th>
              <th className="px-2 py-1 text-left font-semibold">n</th>
              <th className="px-2 py-1 text-left font-semibold">Mean</th>
              <th className="px-2 py-1 text-left font-semibold">Median</th>
              <th className="px-2 py-1 text-left font-semibold">vs {TARGET_S} s</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(timing.byDomain)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([id, s]) => (
                <tr key={id} className="border-b border-border">
                  <td className="px-2 py-1">
                    {id} {domainNames[id] ?? ''}
                  </td>
                  <td className="px-2 py-1">{s.n}</td>
                  <td className="px-2 py-1">{secs(s.meanS)}</td>
                  <td className="px-2 py-1">{secs(s.medianS)}</td>
                  <td className="px-2 py-1">
                    {s.medianS === null ? (
                      '-'
                    ) : timing.slowDomains.includes(id) ? (
                      <Chip tone="weak">Slow</Chip>
                    ) : s.medianS > TARGET_S ? (
                      <Chip tone="close">Over target</Chip>
                    ) : (
                      <Chip tone="good">On pace</Chip>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
