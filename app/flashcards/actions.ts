'use server';

import { z } from 'zod';
import { now } from '@/lib/clock';
import { rateCard } from '@/lib/db/queries/flashcards';

const RateSchema = z.object({
  cardId: z.string().min(1),
  rating: z.enum(['again', 'good', 'easy']),
});

export async function rateCardAction(
  input: z.infer<typeof RateSchema>,
): Promise<{ dueAt: number }> {
  const { cardId, rating } = RateSchema.parse(input);
  return rateCard(cardId, rating, now());
}
