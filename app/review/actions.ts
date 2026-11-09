'use server';

import { redirect } from 'next/navigation';
import { now } from '@/lib/clock';
import { getDueQuestionIds } from '@/lib/db/queries/review';
import { createSession, getOptionKeys } from '@/lib/db/queries/sessions';
import { defaultRng, shuffle } from '@/lib/rng';

export type ActionError = { ok: false; error: string };

// Study-mode session of the due items, oldest due first, with a new option shuffle.
export async function startReview(): Promise<ActionError> {
  const ids = getDueQuestionIds(now());
  if (ids.length === 0) return { ok: false, error: 'Nothing is due' };
  const keys = getOptionKeys(ids);
  const id = createSession({
    kind: 'review',
    mode: 'study',
    filters: { source: 'review' },
    timeLimitS: null,
    items: ids.map((questionId, position) => ({
      questionId,
      position,
      optionOrder: shuffle(keys[questionId] ?? [], defaultRng),
    })),
  });
  redirect(`/practice/${id}`);
}
