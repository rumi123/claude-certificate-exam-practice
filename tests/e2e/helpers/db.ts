import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';

export { DAY_MS } from '@/lib/clock';

export const E2E_DB = 'test-results/e2e.db';

export function sql(query: string): string {
  return execFileSync('sqlite3', [E2E_DB, query], { encoding: 'utf8' }).trim();
}

// Moves the app's clock (TEST_CLOCK=1 reads the `test.clockOffsetMs` setting on every call).
export function setClockOffset(ms: number): void {
  const db = new Database(E2E_DB);
  try {
    db.prepare(
      `insert into setting (key, value) values ('test.clockOffsetMs', ?)
       on conflict(key) do update set value = excluded.value`,
    ).run(JSON.stringify(ms));
  } finally {
    db.close();
  }
}

export const latestSessionId = `(select id from session order by started_at desc limit 1)`;
