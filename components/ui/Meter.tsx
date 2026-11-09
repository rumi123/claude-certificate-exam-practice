import type { Tone } from './Chip';

const FILL: Record<Tone, string> = {
  good: 'bg-good',
  close: 'bg-close',
  weak: 'bg-weak',
  neutral: 'bg-muted',
  accent: 'bg-accent',
};

export function Meter({
  value,
  tone,
  label,
  passLine = 0.72,
  height = 8,
}: {
  value: number | null;
  tone: Tone;
  label: string;
  passLine?: number | null;
  height?: number;
}) {
  const pctOf = (x: number) => `${Math.round(Math.min(1, Math.max(0, x)) * 100)}%`;
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative min-w-0 flex-1 rounded-full bg-surface-2 ${
        value === null ? 'border border-dashed border-muted' : ''
      }`}
      style={{ height }}
    >
      {value !== null && (
        <div className={`h-full rounded-full ${FILL[tone]}`} style={{ width: pctOf(value) }} />
      )}
      {passLine !== null && (
        <div
          className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-fg"
          style={{ left: pctOf(passLine) }}
        />
      )}
    </div>
  );
}
