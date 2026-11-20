'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  abandonSession,
  createMistakesSession,
  createSession,
  finishSession,
  getCandidates,
  getFeedback,
  getOptionKeys,
  recordAnswer,
  setMarked,
} from '@/lib/db/queries/sessions';
import { getPresetContext, getTaskMasteryMap } from '@/lib/db/queries/presets';
import { isPreset, presetSelection } from '@/lib/engine/presets';
import { selectQuestions, type Candidate } from '@/lib/engine/selection';
import { planSession, timeLimitFor } from '@/lib/engine/session';
import { MOCK_POOL, SetupInputSchema, toFilter } from '@/lib/engine/setup-schema';
import type { FeedbackData } from '@/lib/feedback';
import { defaultRng } from '@/lib/rng';

export type ActionError = { ok: false; error: string };

export async function createPracticeSession(input: unknown): Promise<ActionError> {
  const parsed = SetupInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid setup' };
  const setup = parsed.data;

  let pool = 'practice';
  if (setup.source === 'mock') {
    pool = setup.ids[0] ?? '';
    if (setup.ids.length !== 1 || !MOCK_POOL.test(pool))
      return { ok: false, error: 'Unknown question set' };
  }
  let candidates = getCandidates(toFilter(setup), pool);
  let prefer = setup.prefer;
  let rankKey: ((c: Candidate) => number) | undefined;
  let mastery: Record<string, number | null> | undefined;
  if (setup.source === 'preset') {
    const preset = setup.ids[0];
    if (!isPreset(preset)) return { ok: false, error: 'Unknown focus preset' };
    const ctx = getPresetContext();
    const sel = presetSelection(preset, candidates, ctx);
    if (!sel.available) return { ok: false, error: sel.reason ?? 'Preset not available' };
    candidates = sel.cands;
    prefer = sel.prefer ?? prefer;
    rankKey = sel.rankKey;
    mastery = ctx.mastery;
  }
  if (prefer === 'weakest') mastery ??= getTaskMasteryMap();
  const selected = selectQuestions(
    candidates,
    {
      size: setup.size,
      prefer,
      groupByScenario: setup.order === 'group',
      multi: setup.multi,
      mastery,
      rankKey,
    },
    defaultRng,
  );
  if (selected.length === 0) return { ok: false, error: 'No questions match these filters' };

  const items = planSession(selected, getOptionKeys(selected.map((c) => c.id)), defaultRng);
  const id = createSession({
    kind: 'practice',
    mode: setup.mode,
    filters: setup,
    timeLimitS: timeLimitFor(selected.length, setup.timer),
    items,
  });
  redirect(`/practice/${id}`);
}

const SubmitSchema = z.object({
  sessionId: z.string().min(1),
  position: z.number().int().min(0),
  selected: z
    .array(z.enum(['a', 'b', 'c', 'd', 'e']))
    .min(1)
    .max(2),
  confidence: z.enum(['sure', 'unsure', 'guess']),
  timeMs: z.number().int().min(0).max(86_400_000),
});

export type SubmitResult = { ok: true; feedback?: FeedbackData; expired?: true } | ActionError;

export async function submitAnswer(input: unknown): Promise<SubmitResult> {
  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid answer' };
  try {
    const res = recordAnswer(parsed.data);
    if (res.expired) return { ok: true, expired: true };
    if (res.mode !== 'study') return { ok: true };
    return {
      ok: true,
      feedback: getFeedback(res.questionId, parsed.data.selected, res.optionOrder),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save the answer' };
  }
}

const SessionIdSchema = z.string().min(1);

function failure(e: unknown, fallback: string): ActionError {
  return { ok: false, error: e instanceof Error ? e.message : fallback };
}

const MarkSchema = z.object({
  sessionId: z.string().min(1),
  position: z.number().int().min(0),
  marked: z.boolean(),
});

export async function toggleMark(input: unknown): Promise<{ ok: true } | ActionError> {
  const parsed = MarkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid request' };
  try {
    setMarked(parsed.data.sessionId, parsed.data.position, parsed.data.marked);
    return { ok: true };
  } catch (e) {
    return failure(e, 'Could not mark the question');
  }
}

const FinishSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.enum(['user', 'timer']),
});

export async function finishSessionAction(input: unknown): Promise<{ ok: true } | ActionError> {
  const parsed = FinishSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid request' };
  try {
    finishSession(parsed.data.sessionId, parsed.data.reason);
    return { ok: true };
  } catch (e) {
    return failure(e, 'Could not finish the session');
  }
}

export async function abandonSessionAction(sessionId: unknown): Promise<ActionError> {
  const parsed = SessionIdSchema.safeParse(sessionId);
  if (!parsed.success) return { ok: false, error: 'Invalid request' };
  try {
    abandonSession(parsed.data);
  } catch (e) {
    return failure(e, 'Could not abandon the session');
  }
  redirect('/practice');
}

export async function startMistakesReview(sessionId: unknown): Promise<ActionError> {
  const parsed = SessionIdSchema.safeParse(sessionId);
  if (!parsed.success) return { ok: false, error: 'Invalid request' };
  let id: string;
  try {
    id = createMistakesSession(parsed.data);
  } catch (e) {
    return failure(e, 'Could not start the review');
  }
  redirect(`/practice/${id}`);
}

const DrillSchema = z.object({ taskId: z.string().regex(/^\d\.\d+$/) });

// "Drill this task": 10 weakest-first questions of one task, grouped by scenario, study mode.
export async function startDrill(formData: FormData): Promise<void> {
  const parsed = DrillSchema.safeParse({ taskId: formData.get('taskId') });
  if (!parsed.success) redirect('/practice');
  const { taskId } = parsed.data;
  const selected = selectQuestions(
    getCandidates({ tasks: [taskId] }),
    {
      size: 10,
      prefer: 'weakest',
      groupByScenario: true,
      multi: 'yes',
      mastery: getTaskMasteryMap(),
    },
    defaultRng,
  );
  if (selected.length === 0) redirect(`/practice?task=${taskId}`);
  const items = planSession(selected, getOptionKeys(selected.map((c) => c.id)), defaultRng);
  const id = createSession({
    kind: 'practice',
    mode: 'study',
    filters: { source: 'task', ids: [taskId], size: 10, prefer: 'weakest', drill: true },
    timeLimitS: null,
    items,
  });
  redirect(`/practice/${id}`);
}
