import { dateStamp, exportBackup } from '@/lib/backup/export';
import { now } from '@/lib/clock';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const body = JSON.stringify(exportBackup(getDb()), null, 2);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="ccaf-backup-${dateStamp(now())}.json"`,
    },
  });
}
