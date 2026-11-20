'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { clearMarksAction } from '@/app/questions/actions';
import { Button } from '@/components/ui';

export default function ClearMarkButton({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function clear() {
    startTransition(async () => {
      const res = await clearMarksAction({ questionId });
      if (res.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={clear} disabled={pending}>
        Clear mark
      </Button>
      {error && (
        <p role="alert" className="text-sm text-weak">
          {error}
        </p>
      )}
    </>
  );
}
