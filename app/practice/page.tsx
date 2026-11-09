import SetupForm, { type SetupInitial } from '@/components/practice/SetupForm';
import { getDomains, getScenarios, getTasks } from '@/lib/db/queries/catalog';
import { getPreferences, type Preferences } from '@/lib/db/queries/preferences';
import { getPresetContext } from '@/lib/db/queries/presets';
import { getCandidates } from '@/lib/db/queries/sessions';
import { isPreset, PRESETS, presetSelection } from '@/lib/engine/presets';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function list(v: string | string[] | undefined): string[] {
  return (first(v) ?? '').split(',').filter(Boolean);
}

function pick<T extends string>(v: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.find((a) => a === v) ?? fallback;
}

function parseInitial(p: Params, prefs: Preferences): SetupInitial {
  const kinds = [
    ['scenario', list(p.scenario)],
    ['domain', list(p.domain)],
    ['task', list(p.task)],
  ] as const;
  const hit = kinds.find(([, ids]) => ids.length > 0);
  const preset = first(p.preset);
  const size = Number(first(p.size));
  const mode = pick(first(p.mode), ['study', 'test'], prefs.defaultMode);
  return {
    source: isPreset(preset) ? 'preset' : hit ? hit[0] : 'all',
    ids: isPreset(preset) ? [preset] : hit ? hit[1] : [],
    size: Number.isInteger(size) && size >= 5 && size <= 150 ? size : prefs.defaultSize,
    mode,
    prefer: pick(first(p.prefer), ['unseen', 'weakest', 'random'], 'unseen'),
    multi: pick(first(p.multi), ['yes', 'only', 'no'], 'yes'),
    showTimer: prefs.showTimer,
  };
}

export default async function PracticePage({ searchParams }: { searchParams: Promise<Params> }) {
  const initial = parseInitial(await searchParams, getPreferences());
  const all = getCandidates();
  const ctx = getPresetContext();
  const presets = PRESETS.map((id) => {
    const sel = presetSelection(id, all, ctx);
    return {
      id,
      available: sel.available,
      reason: sel.reason,
      candidateIds: sel.cands.map((c) => c.id),
    };
  });
  const candidates = all.map(({ id, scenarioId, type, primaryTaskId, domainId }) => ({
    id,
    scenarioId,
    type,
    primaryTaskId,
    domainId,
  }));
  return (
    <>
      <h1 className="text-2xl font-bold">Practice</h1>
      <p className="mt-1 text-sm text-muted">Choose what to practise, how, and how many.</p>
      <SetupForm
        scenarios={getScenarios().map((s) => ({ id: s.id, name: s.name }))}
        domains={getDomains().map((d) => ({ id: d.id, name: d.name }))}
        tasks={getTasks().map((k) => ({ id: k.id, title: k.title }))}
        candidates={candidates}
        presets={presets}
        initial={initial}
      />
    </>
  );
}
