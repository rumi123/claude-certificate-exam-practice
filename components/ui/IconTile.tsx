import type { LucideIcon } from 'lucide-react';
import type { Tone } from './Chip';

const TONE: Record<Tone, string> = {
  good: 'bg-good-soft text-good',
  close: 'bg-close-soft text-close',
  weak: 'bg-weak-soft text-weak',
  neutral: 'bg-surface-2 text-muted',
  accent: 'bg-accent-soft text-accent',
};

export function IconTile({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  return (
    <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${TONE[tone]}`}>
      <Icon size={18} aria-hidden="true" />
    </span>
  );
}
