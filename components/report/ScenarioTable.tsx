import type { Report } from '@/lib/report/build-report';
import { pct } from './format';

export default function ScenarioTable({ scenarios }: { scenarios: Report['scenarios'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-2 py-1 text-left font-semibold">Scenario</th>
            <th className="px-2 py-1 text-left font-semibold">Answered</th>
            <th className="px-2 py-1 text-left font-semibold">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s) => (
            <tr key={s.id} data-testid="scenario-row" className="border-b border-border">
              <td className="px-2 py-1">
                <span className="whitespace-nowrap">{s.id}</span> {s.name}
              </td>
              <td className="px-2 py-1">{s.answered}</td>
              <td className="px-2 py-1">{pct(s.accuracy)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
