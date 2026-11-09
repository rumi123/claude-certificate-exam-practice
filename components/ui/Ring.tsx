import type { ReactNode } from 'react';
import type { Tone } from './Chip';

const STROKE: Record<Tone, string> = {
  good: 'stroke-good',
  close: 'stroke-close',
  weak: 'stroke-weak',
  neutral: 'stroke-muted',
  accent: 'stroke-accent',
};

export function Ring({
  value,
  tone,
  size = 96,
  tickAt,
  children,
}: {
  value: number;
  tone: Tone;
  size?: number;
  tickAt?: number;
  children?: ReactNode;
}) {
  const w = 8;
  const r = (size - w) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  const tickAngle = tickAt === undefined ? 0 : tickAt * 2 * Math.PI - Math.PI / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={w} className="stroke-surface-2" />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={w}
          strokeLinecap="round"
          strokeDasharray={`${circ * v} ${circ}`}
          transform={`rotate(-90 ${c} ${c})`}
          className={STROKE[tone]}
        />
        {tickAt !== undefined && (
          <line
            x1={c + (r - w) * Math.cos(tickAngle)}
            y1={c + (r - w) * Math.sin(tickAngle)}
            x2={c + (r + w) * Math.cos(tickAngle)}
            y2={c + (r + w) * Math.sin(tickAngle)}
            strokeWidth={2}
            className="stroke-fg"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
