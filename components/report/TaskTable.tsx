'use client';

import { useMemo, useState } from 'react';
import type { TaskRow } from '@/lib/report/build-report';
import { Meter } from '@/components/ui';
import StatusBadge from './StatusBadge';
import { STATUS_TONE, dateOf, pct } from './format';

type Key = 'id' | 'title' | 'status' | 'mastery' | 'n' | 'lastSeenAt';

const COLUMNS: { key: Key; label: string }[] = [
  { key: 'id', label: 'Task' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'mastery', label: 'Mastery' },
  { key: 'n', label: 'n' },
  { key: 'lastSeenAt', label: 'Last seen' },
];

function compareIds(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

function compare(a: TaskRow, b: TaskRow, key: Key): number {
  if (key === 'id') return compareIds(a.id, b.id);
  if (key === 'title' || key === 'status') return a[key].localeCompare(b[key]);
  return (a[key] ?? 0) - (b[key] ?? 0);
}

export default function TaskTable({ rows }: { rows: TaskRow[] }) {
  const [key, setKey] = useState<Key>('id');
  const [asc, setAsc] = useState(true);
  const [untestedOnly, setUntestedOnly] = useState(false);

  const sorted = useMemo(() => {
    const list = rows.filter((r) => !untestedOnly || r.status === 'untested');
    // Rows with no value for the sort column stay at the bottom either way. An untested
    // task's mastery is greyed out (fewer than 3 answers), so it doesn't rank by mastery.
    const missing = (r: TaskRow) =>
      (key === 'mastery' && (r.mastery === null || r.status === 'untested')) ||
      (key === 'lastSeenAt' && r.lastSeenAt === null);
    return list.sort((a, b) => {
      if (missing(a) !== missing(b)) return missing(a) ? 1 : -1;
      const c = compare(a, b, key) || compareIds(a.id, b.id);
      return asc ? c : -c;
    });
  }, [rows, key, asc, untestedOnly]);

  function sortBy(next: Key) {
    if (next === key) setAsc(!asc);
    else {
      setKey(next);
      setAsc(true);
    }
  }

  return (
    <div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={untestedOnly}
          onChange={(e) => setUntestedOnly(e.target.checked)}
        />
        Untested only
      </label>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className="px-2 py-1 text-left font-semibold"
                  aria-sort={key === c.key ? (asc ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" onClick={() => sortBy(c.key)}>
                    {c.label}
                    {key === c.key ? (asc ? ' ▲' : ' ▼') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.id}
                data-testid="task-row"
                data-task={r.id}
                className="border-b border-border"
              >
                <td className="whitespace-nowrap px-2 py-1">{r.id}</td>
                <td className="px-2 py-1">{r.title}</td>
                <td className="px-2 py-1">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-2 py-1">
                  <div className="flex items-center gap-2">
                    <span className="w-20">
                      <Meter
                        value={r.status === 'untested' ? null : r.mastery}
                        tone={STATUS_TONE[r.status]}
                        label={`${r.id} mastery ${pct(r.mastery)}`}
                        passLine={null}
                        height={6}
                      />
                    </span>
                    <span>{pct(r.mastery)}</span>
                  </div>
                </td>
                <td className="px-2 py-1">{r.n}</td>
                <td className="whitespace-nowrap px-2 py-1">{dateOf(r.lastSeenAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
