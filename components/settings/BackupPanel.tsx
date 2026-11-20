'use client';

import { Download } from 'lucide-react';
import { useState, useTransition, type ChangeEvent } from 'react';
import { Button, Card, CardHeader } from '@/components/ui';
import { previewRestoreAction, resetAction, restoreAction } from '@/app/settings/actions';
import { BACKUP_TABLES } from '@/lib/backup/schema';
import type { Counts } from '@/lib/backup/restore';

const FIELD =
  'rounded-lg border border-border bg-surface px-2 py-1.5 text-fg focus-visible:outline-2 focus-visible:outline-accent';

function Restore() {
  const [text, setText] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setCounts(null);
    setErrors([]);
    setDone(false);
    setText(null);
    if (!file) return;
    const content = await file.text();
    startTransition(async () => {
      const res = await previewRestoreAction(content);
      if (res.ok) {
        setText(content);
        setCounts(res.counts);
      } else {
        setErrors(res.errors);
      }
    });
  }

  function confirm() {
    if (text === null) return;
    startTransition(async () => {
      const res = await restoreAction(text);
      if (res.ok) {
        setDone(true);
        setCounts(null);
        setText(null);
      } else {
        setErrors([res.error]);
      }
    });
  }

  return (
    <Card aria-labelledby="restore-h">
      <CardHeader id="restore-h" title="Restore" />
      <p className="text-sm text-muted">
        Replaces all your progress with the contents of a backup file.
      </p>
      <input
        type="file"
        accept="application/json,.json"
        aria-label="Backup file"
        className="mt-2 block text-sm"
        onChange={onFile}
      />
      {errors.length > 0 && (
        <ul role="alert" data-testid="restore-errors" className="mt-2 text-sm text-weak">
          {errors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      {counts && (
        <div data-testid="restore-preview" className="mt-2">
          <table className="text-sm">
            <caption className="text-left font-semibold">This backup contains</caption>
            <tbody>
              {BACKUP_TABLES.map((k) => (
                <tr key={k}>
                  <td className="pr-4">{k}</td>
                  <td data-testid={`count-${k}`}>{counts[k]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button
            type="button"
            variant="primary"
            className="mt-2"
            disabled={pending}
            onClick={confirm}
          >
            Confirm restore
          </Button>
        </div>
      )}
      {done && (
        <p role="status" data-testid="restore-done" className="mt-2 text-sm">
          Progress restored
        </p>
      )}
    </Card>
  );
}

function Reset() {
  const [typed, setTyped] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    startTransition(async () => {
      const res = await resetAction({ confirm: typed });
      setMessage(res.ok ? 'Progress reset' : res.error);
      if (res.ok) setTyped('');
    });
  }

  return (
    <Card aria-labelledby="reset-h" className="border-weak">
      <CardHeader id="reset-h" title="Reset progress" />
      <p className="text-sm text-muted">
        Deletes every session, answer, review item, flag, flashcard state and preference. Questions
        and content stay. Type RESET to enable the button.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          aria-label="Type RESET to confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className={FIELD}
        />
        <Button
          type="button"
          variant="secondary"
          className="!border-weak !text-weak"
          disabled={typed !== 'RESET' || pending}
          onClick={reset}
        >
          Reset progress
        </Button>
      </div>
      {message && (
        <p role="status" data-testid="reset-message" className="mt-2 text-sm">
          {message}
        </p>
      )}
    </Card>
  );
}

export default function BackupPanel() {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      <Card aria-labelledby="backup-h">
        <CardHeader id="backup-h" title="Backup" />
        <p className="text-sm text-muted">Downloads all progress tables as one JSON file.</p>
        <a
          href="/api/backup"
          download
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Download size={16} aria-hidden="true" />
          Download backup
        </a>
      </Card>
      <Restore />
      <Reset />
    </div>
  );
}
