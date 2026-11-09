'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Button, Card } from '@/components/ui';
import { savePreferences } from '@/app/settings/actions';
import type { Preferences } from '@/lib/db/queries/preferences';

const FIELD =
  'rounded-lg border border-border bg-surface px-2 py-1.5 text-fg focus-visible:outline-2 focus-visible:outline-accent';

export default function PreferencesForm({ initial }: { initial: Preferences }) {
  const [size, setSize] = useState(String(initial.defaultSize));
  const [mode, setMode] = useState(initial.defaultMode);
  const [timer, setTimer] = useState(initial.showTimer);
  const [theme, setTheme] = useState(initial.theme);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const n = Number(size);
  const sizeOk = Number.isInteger(n) && n >= 5 && n <= 150;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!sizeOk) return;
    startTransition(async () => {
      const res = await savePreferences({
        defaultSize: n,
        defaultMode: mode,
        showTimer: timer,
        theme,
      });
      setMessage(res.ok ? 'Saved' : res.error);
    });
  }

  return (
    <Card as="div" className="mt-4 max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <label className="flex flex-wrap items-center gap-2">
          <span className="w-48 text-sm font-semibold">Default session size</span>
          <input
            type="number"
            min={1}
            max={150}
            className={`${FIELD} w-24`}
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
        </label>
        <label className="flex flex-wrap items-center gap-2">
          <span className="w-48 text-sm font-semibold">Default mode</span>
          <select
            className={FIELD}
            value={mode}
            onChange={(e) => setMode(e.target.value as Preferences['defaultMode'])}
          >
            <option value="study">Study</option>
            <option value="test">Test</option>
          </select>
        </label>
        <label className="flex flex-wrap items-center gap-2">
          <span className="w-48 text-sm font-semibold">Show timer by default</span>
          <input type="checkbox" checked={timer} onChange={(e) => setTimer(e.target.checked)} />
        </label>
        <label className="flex flex-wrap items-center gap-2">
          <span className="w-48 text-sm font-semibold">Theme</span>
          <select
            className={FIELD}
            value={theme}
            onChange={(e) => setTheme(e.target.value as Preferences['theme'])}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        {!sizeOk && (
          <p role="alert" className="text-sm text-weak">
            Size must be a whole number from 5 to 150
          </p>
        )}
        <Button type="submit" variant="primary" disabled={pending || !sizeOk}>
          Save preferences
        </Button>
        {message && (
          <p role="status" data-testid="prefs-message" className="text-sm">
            {message}
          </p>
        )}
      </form>
    </Card>
  );
}
