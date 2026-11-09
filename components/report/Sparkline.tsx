import { pct } from './format';

const W = 100;
const H = 28;

// Accuracy (0..1) of recent sessions, oldest to newest.
export default function Sparkline({ points }: { points: number[] }) {
  if (points.length === 0) {
    return <span className="text-muted">No sessions yet</span>;
  }
  const x = (i: number) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
  const y = (v: number) => H - 2 - v * (H - 4);
  const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
  return (
    <svg
      data-testid="sparkline"
      viewBox={`0 0 ${W} ${H}`}
      className="h-7 w-24 overflow-visible"
      role="img"
      aria-label={`Accuracy of the last ${points.length} sessions: ${points.map(pct).join(', ')}`}
    >
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" />
      {points.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="var(--accent)" />
      ))}
    </svg>
  );
}
