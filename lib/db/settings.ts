import { eq } from 'drizzle-orm';
import { getDb } from './client';
import { setting } from './schema';

export function getSetting<T>(key: string, fallback: T): T {
  const row = getDb().select().from(setting).where(eq(setting.key, key)).get();
  return row ? (JSON.parse(row.value) as T) : fallback;
}

export function setSetting(key: string, value: unknown): void {
  const json = JSON.stringify(value);
  getDb()
    .insert(setting)
    .values({ key, value: json })
    .onConflictDoUpdate({ target: setting.key, set: { value: json } })
    .run();
}
