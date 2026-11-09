import Link from 'next/link';

export type NavItem = { position: number; answered: boolean; marked: boolean };

export default function QuestionNavigator({
  sessionId,
  items,
  current,
}: {
  sessionId: string;
  items: NavItem[];
  current: number;
}) {
  return (
    <nav aria-label="Question navigator" className="flex flex-wrap gap-1">
      {items.map((i) => {
        const state = i.answered ? 'answered' : 'unanswered';
        const base =
          'relative flex size-8 items-center justify-center rounded-lg border border-border text-sm font-medium';
        const tone = i.answered ? 'bg-surface-2' : 'bg-surface';
        const ring = i.position === current ? ' ring-2 ring-accent' : '';
        return (
          <Link
            key={i.position}
            href={`/practice/${sessionId}?pos=${i.position}`}
            data-testid="nav-item"
            data-state={state}
            data-marked={i.marked}
            aria-current={i.position === current ? 'true' : undefined}
            aria-label={`Question ${i.position + 1}, ${state}${i.marked ? ', marked' : ''}`}
            className={`${base} ${tone}${ring}`}
          >
            {i.position + 1}
            {i.marked && (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-close"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
