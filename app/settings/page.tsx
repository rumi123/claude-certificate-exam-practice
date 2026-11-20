import Link from 'next/link';
import { Card, CardHeader } from '@/components/ui';
import BackupPanel from '@/components/settings/BackupPanel';
import FlagsPanel from '@/components/settings/FlagsPanel';
import PreferencesForm from '@/components/settings/PreferencesForm';
import { dateStamp } from '@/lib/backup/export';
import { now } from '@/lib/clock';
import { getContentInfo } from '@/lib/db/queries/content-meta';
import { getOpenFlags } from '@/lib/db/queries/flags';
import { getPreferences } from '@/lib/db/queries/preferences';

export const dynamic = 'force-dynamic';

const TABS = [
  { id: 'backup', label: 'Backup & restore' },
  { id: 'flags', label: 'Flags' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'about', label: 'About' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const TAB = 'rounded-full px-3 py-1 text-sm font-medium';
const TAB_ON = 'bg-accent text-accent-fg';
const TAB_OFF = 'text-fg hover:bg-surface';

function About() {
  const { versions, importedAt } = getContentInfo();
  const model = process.env.AI_MODEL || 'claude-sonnet-5-5';
  return (
    <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <Card aria-labelledby="ai-h">
        <CardHeader id="ai-h" title="AI" />
        <p data-testid="ai-status" className="text-sm">
          Off: set AI_FEATURES=on and ANTHROPIC_API_KEY in .env.local
        </p>
        <p className="text-sm text-muted">Model: {model}</p>
      </Card>
      <Card aria-labelledby="content-h">
        <CardHeader id="content-h" title="Content" />
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="pr-6 text-left">File</th>
                <th className="text-left">Version</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(versions).map(([file, v]) => (
                <tr key={file}>
                  <td className="pr-6">{file}</td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p data-testid="last-import" className="mt-2 text-sm">
          Last import: {importedAt === null ? 'never' : new Date(importedAt).toLocaleString()}
        </p>
      </Card>
    </div>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: raw } = await searchParams;
  const tab: TabId = TABS.find((x) => x.id === raw)?.id ?? 'backup';
  return (
    <>
      <h1 className="text-2xl font-bold">Settings</h1>
      <div
        className="mt-4 flex w-fit max-w-full flex-wrap gap-1 rounded-full bg-surface-2 p-1"
        role="tablist"
        aria-label="Settings sections"
      >
        {TABS.map((x) => (
          <Link
            key={x.id}
            href={`/settings?tab=${x.id}`}
            role="tab"
            aria-selected={x.id === tab}
            className={`${TAB} ${x.id === tab ? TAB_ON : TAB_OFF}`}
          >
            {x.label}
          </Link>
        ))}
      </div>
      {tab === 'backup' && <BackupPanel />}
      {tab === 'flags' && <FlagsPanel flags={getOpenFlags()} stamp={dateStamp(now())} />}
      {tab === 'preferences' && <PreferencesForm initial={getPreferences()} />}
      {tab === 'about' && <About />}
    </>
  );
}
