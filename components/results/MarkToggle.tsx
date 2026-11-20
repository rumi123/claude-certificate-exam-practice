'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toggleMark } from '@/app/practice/actions';
import { Button } from '@/components/ui';

type Props = { sessionId: string; position: number; marked: boolean };

export default function MarkToggle({ sessionId, position, marked }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await toggleMark({ sessionId, position, marked: !marked });
      if (res.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="mb-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-pressed={marked}
        onClick={toggle}
        disabled={pending}
      >
        {marked ? 'Unmark' : 'Mark'}
      </Button>
      {error && (
        <p role="alert" className="mt-1 text-sm text-weak">
          {error}
        </p>
      )}
    </div>
  );
}
