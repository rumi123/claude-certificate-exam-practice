'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { previewRestore, resetProgress, restoreBackup, type Counts } from '@/lib/backup/restore';
import { getDb } from '@/lib/db/client';
import { resolveFlagById } from '@/lib/db/queries/flags';
import { savePreferencesRow } from '@/lib/db/queries/preferences';

export type PreviewResult = { ok: true; counts: Counts } | { ok: false; errors: string[] };
export type ActionResult = { ok: true } | { ok: false; error: string };

const TextSchema = z.string().min(1, 'The file is empty');
const ResetSchema = z.object({ confirm: z.literal('RESET', { error: 'Type RESET to confirm' }) });
const FlagIdSchema = z.number().int().positive();
const PreferencesSchema = z.object({
  defaultSize: z.number().int().min(5).max(150),
  defaultMode: z.enum(['study', 'test']),
  showTimer: z.boolean(),
  theme: z.enum(['system', 'light', 'dark']),
});

function refresh() {
  revalidatePath('/', 'layout');
}

export async function previewRestoreAction(text: string): Promise<PreviewResult> {
  const parsed = TextSchema.safeParse(text);
  if (!parsed.success) return { ok: false, errors: [parsed.error.issues[0].message] };
  return previewRestore(getDb(), parsed.data);
}

export async function restoreAction(text: string): Promise<ActionResult> {
  const parsed = TextSchema.safeParse(text);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    restoreBackup(getDb(), parsed.data);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Restore failed' };
  }
  refresh();
  return { ok: true };
}

export async function resetAction(input: { confirm: string }): Promise<ActionResult> {
  const parsed = ResetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  resetProgress(getDb());
  refresh();
  return { ok: true };
}

export async function resolveFlag(id: number): Promise<ActionResult> {
  const parsed = FlagIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: 'Invalid flag' };
  resolveFlagById(parsed.data);
  refresh();
  return { ok: true };
}

export async function savePreferences(
  input: z.infer<typeof PreferencesSchema>,
): Promise<ActionResult> {
  const parsed = PreferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  savePreferencesRow(parsed.data);
  refresh();
  return { ok: true };
}
