import { eq } from 'drizzle-orm';
import { getDb } from '../client';
import { contentMeta } from '../schema';

function read<T>(key: string, fallback: T): T {
  const row = getDb().select().from(contentMeta).where(eq(contentMeta.key, key)).get();
  return row ? (JSON.parse(row.value) as T) : fallback;
}

export function getContentInfo(): { versions: Record<string, number>; importedAt: number | null } {
  return {
    versions: read<Record<string, number>>('versions', {}),
    importedAt: read<number | null>('importedAt', null),
  };
}
