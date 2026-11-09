import { asc, isNotNull } from 'drizzle-orm';
import { taskMastery } from '@/lib/analytics/mastery';
import { trapProfile } from '@/lib/analytics/traps';
import type { Status } from '@/lib/analytics/types';
import type { PresetContext } from '@/lib/engine/presets';
import { getDb } from '../client';
import * as t from '../schema';
import { getDomains, getTasks } from './catalog';
import { getAnsweredItems } from './history';

function trapsByQuestion(): Record<string, string[]> {
  const rows = getDb()
    .select({ questionId: t.questionOption.questionId, trapId: t.questionOption.trapId })
    .from(t.questionOption)
    .where(isNotNull(t.questionOption.trapId))
    .orderBy(asc(t.questionOption.questionId), asc(t.questionOption.position))
    .all();
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.questionId] ??= []).push(r.trapId!);
  return out;
}

// Mastery per task, for "weakest first" selection.
export function getTaskMasteryMap(): Record<string, number | null> {
  const items = getAnsweredItems();
  return Object.fromEntries(
    getTasks().map((task) => [task.id, taskMastery(items, task.id).mastery]),
  );
}

export function getPresetContext(): PresetContext {
  const items = getAnsweredItems();
  const mastery: PresetContext['mastery'] = {};
  const taskStatus: Record<string, Status> = {};
  for (const task of getTasks()) {
    const m = taskMastery(items, task.id);
    mastery[task.id] = m.mastery;
    taskStatus[task.id] = m.status;
  }
  return {
    mastery,
    taskStatus,
    domainWeight: Object.fromEntries(getDomains().map((d) => [d.id, d.weight])),
    topTraps: trapProfile(items)
      .slice(0, 3)
      .map((r) => r.trapId),
    trapsByQuestion: trapsByQuestion(),
    blindSpotQuestionIds: items
      .filter((i) => i.confidence === 'sure' && !i.isCorrect)
      .map((i) => ({ id: i.questionId, at: i.answeredAt })),
  };
}
