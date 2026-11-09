import { and, asc, count, eq, gt, gte, isNull, lte, min } from 'drizzle-orm';
import { getDb } from '../client';
import * as t from '../schema';
import { nextCardState, type CardRating } from '@/lib/srs/leitner';

export const MAX_SESSION_CARDS = 30;
export const NEW_CARDS_PER_DAY = 10;

export type Deck = 'concepts' | 'anti-patterns';

export type Card = {
  id: string;
  deck: string;
  taskId: string | null;
  domainId: string | null;
  trapId: string | null;
  trapName: string | null;
  front: string;
  back: string;
};

const CARD_COLUMNS = {
  id: t.flashcard.id,
  deck: t.flashcard.deck,
  taskId: t.flashcard.taskId,
  domainId: t.flashcard.domainId,
  trapId: t.flashcard.trapId,
  trapName: t.trap.name,
  front: t.flashcard.front,
  back: t.flashcard.back,
};

function localMidnight(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function scope(deck: Deck, domain?: string) {
  return domain
    ? and(eq(t.flashcard.deck, deck), eq(t.flashcard.retired, 0), eq(t.flashcard.domainId, domain))
    : and(eq(t.flashcard.deck, deck), eq(t.flashcard.retired, 0));
}

function newIntroducedToday(now: number): number {
  const row = getDb()
    .select({ n: count() })
    .from(t.flashcardState)
    .where(gte(t.flashcardState.firstSeenAt, localMidnight(now)))
    .get();
  return row?.n ?? 0;
}

export function getCardQueue({
  deck,
  domain,
  now,
}: {
  deck: Deck;
  domain?: string;
  now: number;
}): Card[] {
  const db = getDb();
  const due = db
    .select(CARD_COLUMNS)
    .from(t.flashcard)
    .innerJoin(t.flashcardState, eq(t.flashcardState.cardId, t.flashcard.id))
    .leftJoin(t.trap, eq(t.trap.id, t.flashcard.trapId))
    .where(and(scope(deck, domain), lte(t.flashcardState.dueAt, now)))
    .orderBy(asc(t.flashcardState.dueAt), asc(t.flashcard.id))
    .limit(MAX_SESSION_CARDS)
    .all();
  const room = Math.min(
    MAX_SESSION_CARDS - due.length,
    Math.max(0, NEW_CARDS_PER_DAY - newIntroducedToday(now)),
  );
  if (room <= 0) return due;
  const fresh = db
    .select(CARD_COLUMNS)
    .from(t.flashcard)
    .leftJoin(t.flashcardState, eq(t.flashcardState.cardId, t.flashcard.id))
    .leftJoin(t.trap, eq(t.trap.id, t.flashcard.trapId))
    .where(and(scope(deck, domain), isNull(t.flashcardState.cardId)))
    .orderBy(asc(t.flashcard.id))
    .limit(room)
    .all();
  return [...due, ...fresh];
}

export function rateCard(cardId: string, rating: CardRating, now: number): { dueAt: number } {
  const db = getDb();
  return db.transaction((tx) => {
    const current = tx
      .select()
      .from(t.flashcardState)
      .where(eq(t.flashcardState.cardId, cardId))
      .get();
    const next = nextCardState(current ?? null, rating, now);
    tx.insert(t.flashcardState)
      .values({
        cardId,
        box: next.box,
        dueAt: next.dueAt,
        firstSeenAt: now,
        lastRatedAt: now,
      })
      .onConflictDoUpdate({
        target: t.flashcardState.cardId,
        set: { box: next.box, dueAt: next.dueAt, lastRatedAt: now },
      })
      .run();
    return { dueAt: next.dueAt };
  });
}

// Earliest future due time among rated cards in the scope, or null.
export function getNextCardDue(deck: Deck, domain: string | undefined, now: number): number | null {
  const row = getDb()
    .select({ at: min(t.flashcardState.dueAt) })
    .from(t.flashcardState)
    .innerJoin(t.flashcard, eq(t.flashcard.id, t.flashcardState.cardId))
    .where(and(scope(deck, domain), gt(t.flashcardState.dueAt, now)))
    .get();
  return row?.at ?? null;
}

export function getCardStats(now: number): {
  dueByDeck: Record<string, number>;
  dueTotal: number;
  newAvailableToday: number;
} {
  const db = getDb();
  const rows = db
    .select({ deck: t.flashcard.deck, n: count() })
    .from(t.flashcardState)
    .innerJoin(t.flashcard, eq(t.flashcard.id, t.flashcardState.cardId))
    .where(and(eq(t.flashcard.retired, 0), lte(t.flashcardState.dueAt, now)))
    .groupBy(t.flashcard.deck)
    .all();
  const dueByDeck = Object.fromEntries(rows.map((r) => [r.deck, r.n]));
  const dueTotal = rows.reduce((sum, r) => sum + r.n, 0);
  const unseen = db
    .select({ n: count() })
    .from(t.flashcard)
    .leftJoin(t.flashcardState, eq(t.flashcardState.cardId, t.flashcard.id))
    .where(and(eq(t.flashcard.retired, 0), isNull(t.flashcardState.cardId)))
    .get();
  const newAvailableToday = Math.min(
    unseen?.n ?? 0,
    Math.max(0, NEW_CARDS_PER_DAY - newIntroducedToday(now)),
  );
  return { dueByDeck, dueTotal, newAvailableToday };
}
