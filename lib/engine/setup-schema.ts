import { z } from 'zod';
import type { Candidate } from './selection';

export const SetupInputSchema = z.object({
  source: z.enum(['all', 'scenario', 'domain', 'task', 'preset', 'mock']),
  ids: z.array(z.string().min(1)).max(100),
  size: z.number().int().min(5).max(150),
  mode: z.enum(['study', 'test']),
  timer: z.boolean(),
  order: z.enum(['group', 'mixed']),
  prefer: z.enum(['unseen', 'weakest', 'random']),
  multi: z.enum(['yes', 'only', 'no']),
});

// A mock paper's pool name, e.g. `mock-1`.
export const MOCK_POOL = /^mock-\d+$/;

export type SetupInput = z.infer<typeof SetupInputSchema>;

export type SetupFilter = { scenarios?: string[]; domains?: string[]; tasks?: string[] };

export function toFilter(input: Pick<SetupInput, 'source' | 'ids'>): SetupFilter {
  if (input.source === 'scenario') return { scenarios: input.ids };
  if (input.source === 'domain') return { domains: input.ids };
  if (input.source === 'task') return { tasks: input.ids };
  return {};
}

export type PracticeProgress = { total: number; remaining: number };

// A question is attended once it has been answered in any session.
export function countProgress(cands: Pick<Candidate, 'lastSeenAt'>[]): PracticeProgress {
  return {
    total: cands.length,
    remaining: cands.filter((c) => c.lastSeenAt === null).length,
  };
}

type Filterable = Pick<Candidate, 'scenarioId' | 'domainId' | 'primaryTaskId'>;

// A filter that is present but empty matches nothing.
export function filterCandidates<T extends Filterable>(cands: T[], filter: SetupFilter): T[] {
  return cands.filter(
    (c) =>
      (!filter.scenarios || filter.scenarios.includes(c.scenarioId)) &&
      (!filter.domains || filter.domains.includes(c.domainId)) &&
      (!filter.tasks || filter.tasks.includes(c.primaryTaskId)),
  );
}
