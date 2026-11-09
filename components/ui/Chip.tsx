import type { ReactNode } from 'react';

export type Tone = 'good' | 'close' | 'weak' | 'neutral' | 'accent';

const TONE: Record<Tone, string> = {
  good: 'bg-good-soft text-good',
  close: 'bg-close-soft text-close',
  weak: 'bg-weak-soft text-weak',
  neutral: 'bg-surface-2 text-muted',
  accent: 'bg-accent-soft text-accent',
};

export function Chip({
  tone,
  children,
  ...rest
}: { tone: Tone; children: ReactNode } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...rest}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TONE[tone]} ${rest.className ?? ''}`}
    >
      {children}
    </span>
  );
}
