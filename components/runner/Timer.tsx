'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { finishSessionAction } from '@/app/practice/actions';

function format(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

// Counts down from the server's remaining time; at zero the timer finishes the session.
export default function Timer({
  sessionId,
  remainingMs,
}: {
  sessionId: string;
  remainingMs: number;
}) {
  const router = useRouter();
  const [left, setLeft] = useState(remainingMs);

  useEffect(() => {
    const startedAt = performance.now();
    let fired = false;
    const id = setInterval(() => {
      const next = Math.max(0, remainingMs - (performance.now() - startedAt));
      setLeft(next);
      if (next === 0 && !fired) {
        fired = true;
        void finishSessionAction({ sessionId, reason: 'timer' }).then(() =>
          router.push(`/practice/${sessionId}/summary`),
        );
      }
    }, 250);
    return () => clearInterval(id);
  }, [sessionId, remainingMs, router]);

  return (
    <p
      data-testid="timer"
      className={`flex items-center gap-1 font-mono text-sm ${left < 60_000 ? 'font-bold text-weak' : ''}`}
    >
      <Clock size={14} aria-hidden="true" />
      Time left {format(left)}
    </p>
  );
}
