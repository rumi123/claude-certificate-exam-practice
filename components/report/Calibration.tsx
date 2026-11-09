import type { Report } from '@/lib/report/build-report';
import { pct } from './format';

export default function Calibration({
  calibration,
  taskTitles,
}: {
  calibration: Report['calibration'];
  taskTitles: Record<string, string>;
}) {
  const byTask = Object.entries(calibration.blindByTask).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { numeric: true }),
  );
  return (
    <div className="text-sm">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-surface-2 p-3">
          <dt className="text-muted">Blind spots (sure and wrong)</dt>
          <dd data-testid="blind-spots" className="font-semibold">
            {calibration.blindSpots.length}
          </dd>
        </div>
        <div className="rounded-lg bg-surface-2 p-3">
          <dt className="text-muted">Lucky guesses</dt>
          <dd className="font-semibold">{calibration.luckyGuesses}</dd>
        </div>
        <div className="rounded-lg bg-surface-2 p-3">
          <dt className="text-muted">Unsure answers</dt>
          <dd className="font-semibold">{calibration.unsure}</dd>
        </div>
        <div className="rounded-lg bg-surface-2 p-3">
          <dt className="text-muted">Correct when sure</dt>
          <dd className="font-semibold">{pct(calibration.score)}</dd>
        </div>
      </dl>
      {byTask.length > 0 && (
        <ul className="mt-3 list-disc pl-5">
          {byTask.map(([id, n]) => (
            <li key={id}>
              {id} {taskTitles[id] ?? ''}: {n} blind {n === 1 ? 'spot' : 'spots'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
