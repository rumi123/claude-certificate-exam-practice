'use server';

import { z } from 'zod';
import { now } from '@/lib/clock';
import { addFlag } from '@/lib/db/queries/questions';

const FlagSchema = z.object({
  questionId: z.string().min(1),
  note: z.string().trim().min(1, 'Write a note').max(1000, 'At most 1000 characters'),
});

export type FlagResult = { ok: true } | { ok: false; error: string };

export async function flagQuestion(input: z.infer<typeof FlagSchema>): Promise<FlagResult> {
  const parsed = FlagSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };
  const { questionId, note } = parsed.data;
  return addFlag(questionId, note, now())
    ? { ok: true }
    : { ok: false, error: 'Question not found' };
}
