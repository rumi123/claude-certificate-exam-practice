import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { setClockOffsetProvider } from '../clock';
import * as schema from './schema';

export type Db = BetterSQLite3Database<typeof schema>;

let instance: Db | null = null;
let sqlite: Database.Database | null = null;
let dbPath = '';

export function getDbPath(): string {
  return dbPath;
}

function readTestClockOffset(db: Db): number {
  const row = db
    .select()
    .from(schema.setting)
    .where(eq(schema.setting.key, 'test.clockOffsetMs'))
    .get();
  if (!row) return 0;
  const n = Number(JSON.parse(row.value));
  return Number.isFinite(n) ? n : 0;
}

export function getDb(): Db {
  if (instance) return instance;
  dbPath = process.env.DATABASE_PATH ?? 'data/aicert.db';
  fs.mkdirSync(path.dirname(path.resolve(/*turbopackIgnore: true*/ dbPath)), { recursive: true });
  sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: 'drizzle' });
  if (process.env.TEST_CLOCK === '1') {
    setClockOffsetProvider(() => readTestClockOffset(db));
  }
  instance = db;
  return db;
}

// Raw handle for bulk scripts (seed-perf); opens the db first if needed.
export function getSqlite(): Database.Database {
  getDb();
  return sqlite!;
}

export function closeDb(): void {
  sqlite?.close();
  sqlite = null;
  instance = null;
}
