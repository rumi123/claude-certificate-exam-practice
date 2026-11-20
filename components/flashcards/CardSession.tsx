'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { CircleCheck } from 'lucide-react';
import { rateCardAction } from '@/app/flashcards/actions';
import { Button, Card as UiCard, Chip, EmptyState } from '@/components/ui';
import type { Card } from '@/lib/db/queries/flashcards';
import type { CardRating } from '@/lib/srs/leitner';

const RATINGS: { rating: CardRating; label: string; key: string }[] = [
  { rating: 'again', label: 'Again', key: '1' },
  { rating: 'good', label: 'Good', key: '2' },
  { rating: 'easy', label: 'Easy', key: '3' },
];

export default function CardSession({
  cards,
  deck,
  nextDueAt,
}: {
  cards: Card[];
  deck: string;
  nextDueAt: number | null;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [earliest, setEarliest] = useState<number | null>(nextDueAt);
  const [pending, startTransition] = useTransition();
  const card = cards[index];

  const rate = useCallback(
    (rating: CardRating) => {
      if (!card || pending) return;
      startTransition(async () => {
        const { dueAt } = await rateCardAction({ cardId: card.id, rating });
        setEarliest((e) => (e === null ? dueAt : Math.min(e, dueAt)));
        setIndex((i) => i + 1);
        setRevealed(false);
      });
    },
    [card, pending],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === ' ' && !revealed) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed) {
        const match = RATINGS.find((r) => r.key === e.key);
        if (match) rate(match.rating);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, rate]);

  if (!card) {
    return (
      <div className="mx-auto mt-6 max-w-3xl">
        <EmptyState icon={CircleCheck} title="Done for now." testId="cards-done">
          {earliest !== null && `Next card due ${new Date(earliest).toLocaleDateString()}`}
        </EmptyState>
      </div>
    );
  }

  return (
    <section className="mx-auto mt-6 max-w-3xl" aria-label="Card">
      <p className="text-sm text-muted">
        Card {index + 1} of {cards.length}
      </p>
      <UiCard as="div" className="mt-2 flex min-h-48 flex-col justify-center p-6">
        <p data-testid="card-front" className="text-center text-xl">
          {card.front}
        </p>
        {revealed && (
          <div className="mt-4 border-t border-border pt-4">
            <p data-testid="card-back" className="text-center">
              {card.back}
            </p>
            <p className="mt-3 flex flex-wrap justify-center gap-2">
              {card.taskId && (
                <Chip tone="neutral" data-testid="task-tag">
                  Task {card.taskId}
                </Chip>
              )}
              {deck === 'anti-patterns' && card.trapId && (
                <Chip tone="close" data-testid="trap-badge">
                  {card.trapName ?? card.trapId}
                </Chip>
              )}
            </p>
          </div>
        )}
      </UiCard>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {revealed ? (
          RATINGS.map((r) => (
            <Button
              key={r.rating}
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => rate(r.rating)}
            >
              {r.label} ({r.key})
            </Button>
          ))
        ) : (
          <Button type="button" variant="primary" onClick={() => setRevealed(true)}>
            Reveal (Space)
          </Button>
        )}
      </div>
    </section>
  );
}
