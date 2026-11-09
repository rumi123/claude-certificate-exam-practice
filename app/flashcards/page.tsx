import Link from 'next/link';
import { now } from '@/lib/clock';
import { getDomains } from '@/lib/db/queries/catalog';
import { getCardQueue, getNextCardDue, type Deck } from '@/lib/db/queries/flashcards';
import CardSession from '@/components/flashcards/CardSession';

export const dynamic = 'force-dynamic';

const DECKS: { id: Deck; label: string }[] = [
  { id: 'concepts', label: 'Concepts' },
  { id: 'anti-patterns', label: 'Anti-patterns' },
];

function href(deck: Deck, domain?: string): string {
  return `/flashcards?deck=${deck}${domain ? `&domain=${domain}` : ''}`;
}

const TAB = 'rounded-full border px-3 py-1 text-sm';
const TAB_ON = 'border-accent bg-accent-soft font-medium text-accent';
const TAB_OFF = 'border-border hover:bg-surface-2';

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string; domain?: string }>;
}) {
  const params = await searchParams;
  const deck: Deck = params.deck === 'anti-patterns' ? 'anti-patterns' : 'concepts';
  const domains = getDomains();
  const domain = domains.find((d) => d.id === params.domain)?.id;
  const t = now();
  const queue = getCardQueue({ deck, domain, now: t });
  const nextDueAt = getNextCardDue(deck, domain, t);

  return (
    <>
      <h1 className="text-2xl font-bold">Flashcards</h1>
      <nav aria-label="Deck" className="mt-4 flex gap-2">
        {DECKS.map((d) => (
          <Link
            key={d.id}
            href={href(d.id, domain)}
            aria-current={d.id === deck ? 'page' : undefined}
            className={`${TAB} ${d.id === deck ? TAB_ON : TAB_OFF}`}
          >
            {d.label}
          </Link>
        ))}
      </nav>
      <nav aria-label="Domain" className="mt-2 flex flex-wrap gap-2">
        <Link
          href={href(deck)}
          aria-current={domain ? undefined : 'page'}
          className={`${TAB} ${domain ? TAB_OFF : TAB_ON}`}
        >
          All domains
        </Link>
        {domains.map((d) => (
          <Link
            key={d.id}
            href={href(deck, d.id)}
            title={d.name}
            aria-current={d.id === domain ? 'page' : undefined}
            className={`${TAB} ${d.id === domain ? TAB_ON : TAB_OFF}`}
          >
            {d.id}
          </Link>
        ))}
      </nav>
      <CardSession
        key={`${deck}-${domain ?? 'all'}`}
        cards={queue}
        deck={deck}
        nextDueAt={nextDueAt}
      />
    </>
  );
}
