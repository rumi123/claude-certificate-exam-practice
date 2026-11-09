'use client';

import { useState, useTransition } from 'react';
import { flagQuestion } from '@/app/questions/actions';
import { Button } from '@/components/ui';

export default function FlagForm({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const invalid = note.trim().length < 1 || note.length > 1000;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || pending) return;
    startTransition(async () => {
      const res = await flagQuestion({ questionId, note });
      if (res.ok) {
        setMessage({ ok: true, text: 'Flag saved' });
        setNote('');
        setOpen(false);
      } else {
        setMessage({ ok: false, text: res.error });
      }
    });
  }

  return (
    <div className="text-sm">
      {!open && (
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
          Flag this question
        </Button>
      )}
      {open && (
        <form onSubmit={submit} className="space-y-2" aria-label="Flag this question">
          <label className="block">
            <span className="font-medium">What is wrong with this question?</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
              required
              className="mt-1 block w-full rounded border border-border bg-transparent p-2"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={invalid || pending}>
              Save flag
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      {message && (
        <p
          aria-live="polite"
          data-testid="flag-message"
          className={`mt-2 ${message.ok ? 'text-good' : 'text-weak'}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
