'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { createPracticeSession } from '@/app/practice/actions';
import { Button, Card, CardHeader, Chip } from '@/components/ui';
import { plural } from '@/lib/format/plural';
import { isPreset, PRESET_NAMES, type Preset } from '@/lib/engine/presets';
import {
  countProgress,
  filterCandidates,
  toFilter,
  type PracticeProgress,
  type SetupInput,
} from '@/lib/engine/setup-schema';
import type { Candidate } from '@/lib/engine/selection';

type Summary = Pick<
  Candidate,
  'id' | 'scenarioId' | 'type' | 'primaryTaskId' | 'domainId' | 'lastSeenAt'
>;
type Option = { id: string; label: string; progress: PracticeProgress };

export type MockPool = { id: string; candidates: Summary[] };

export type PresetInfo = {
  id: Preset;
  available: boolean;
  reason?: string;
  candidateIds: string[];
};

export type SetupInitial = {
  source: SetupInput['source'];
  ids: string[];
  size: number;
  mode: SetupInput['mode'];
  prefer: SetupInput['prefer'];
  multi: SetupInput['multi'];
  showTimer: boolean;
};

const FIELD = 'w-full min-w-0 rounded-lg border border-border bg-surface px-2 py-1.5';
const ROW = 'flex flex-wrap items-center gap-2 sm:flex-nowrap';
const LABEL = 'w-40 shrink-0 text-sm font-semibold';
const SIZES = [5, 10, 25, 50];
const MODES: { value: SetupInput['mode']; label: string }[] = [
  { value: 'study', label: 'Study (feedback after each question)' },
  { value: 'test', label: 'Test (feedback at the end)' },
];

function matching(
  cands: Summary[],
  source: SetupInput['source'],
  ids: string[],
  multi: SetupInput['multi'],
  presets: PresetInfo[],
  mockPools: MockPool[],
): Summary[] {
  const pool =
    source === 'preset'
      ? presetPool(
          cands,
          presets.find((p) => p.id === ids[0]),
        )
      : source === 'mock'
        ? (mockPools.find((m) => m.id === ids[0])?.candidates ?? [])
        : filterCandidates(cands, toFilter({ source, ids }));
  return pool.filter((c) => multi === 'yes' || (multi === 'only') === (c.type === 'multi'));
}

// Presets deliberately revisit attended questions, so they keep the plain total.
function availableText(source: SetupInput['source'], { total, remaining }: PracticeProgress) {
  if (source === 'preset' || total === remaining) return `${plural(total, 'question')} available`;
  if (remaining === 0) return `All ${total} completed. Starting will repeat attended questions.`;
  return `${plural(remaining, 'question')} available to practise (${total - remaining} of ${total} already attended)`;
}

function ProgressChip({ id, progress }: { id: string; progress: PracticeProgress }) {
  const { total, remaining } = progress;
  const testId = `progress-${id}`;
  if (total === 0) {
    return (
      <Chip tone="neutral" data-testid={testId}>
        No questions
      </Chip>
    );
  }
  if (remaining === 0) {
    return (
      <Chip tone="good" data-testid={testId}>
        Completed
      </Chip>
    );
  }
  return (
    <Chip tone="neutral" data-testid={testId}>
      {remaining} of {total} left
    </Chip>
  );
}

function mockLabel(id: string): string {
  return `Paper ${id.replace('mock-', '')}`;
}

function presetPool(cands: Summary[], info: PresetInfo | undefined): Summary[] {
  const wanted = new Set(info?.candidateIds ?? []);
  return cands.filter((c) => wanted.has(c.id));
}

function presetLabel(info: PresetInfo, count: number): string {
  const name = PRESET_NAMES[info.id];
  return info.available
    ? `${name} (${count} questions)`
    : `${name}: ${info.reason ?? 'Not available'}`;
}

function CheckGroup(props: {
  legend: string;
  options: Option[];
  ids: string[];
  onChange: (ids: string[]) => void;
}) {
  const { legend, options, ids, onChange } = props;
  return (
    <fieldset className="mt-2 grid gap-1 sm:grid-cols-2">
      <legend className="mb-1 text-sm font-semibold">{legend}</legend>
      {options.map((o) => (
        <label key={o.id} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={ids.includes(o.id)}
            onChange={(e) =>
              onChange(e.target.checked ? [...ids, o.id] : ids.filter((x) => x !== o.id))
            }
          />
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span>{o.label}</span>
            <ProgressChip id={o.id} progress={o.progress} />
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export default function SetupForm(props: {
  scenarios: { id: string; name: string }[];
  domains: { id: string; name: string }[];
  tasks: { id: string; title: string }[];
  candidates: Summary[];
  presets: PresetInfo[];
  mockPools?: MockPool[];
  initial: SetupInitial;
}) {
  const { initial, candidates, presets } = props;
  const mockPools = props.mockPools ?? [];
  const [source, setSource] = useState(initial.source);
  const [ids, setIds] = useState(initial.ids);
  const [sizeChoice, setSizeChoice] = useState(
    SIZES.includes(initial.size) ? String(initial.size) : 'custom',
  );
  const [custom, setCustom] = useState(String(initial.size));
  const [mode, setMode] = useState(initial.mode);
  const [timer, setTimer] = useState(initial.showTimer || initial.mode === 'test');
  const [timerTouched, setTimerTouched] = useState(false);
  const [order, setOrder] = useState<SetupInput['order']>('group');
  const [prefer, setPrefer] = useState(initial.prefer);
  const [multi, setMulti] = useState(initial.multi);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const progress = countProgress(matching(candidates, source, ids, multi, presets, mockPools));
  const optionProgress = (id: string) =>
    countProgress(matching(candidates, source, [id], multi, presets, mockPools));
  const presetOk = source !== 'preset' || presets.find((p) => p.id === ids[0])?.available === true;
  const mockOk = source !== 'mock' || mockPools.some((m) => m.id === ids[0]);
  const size = sizeChoice === 'custom' ? Number(custom) : Number(sizeChoice);
  const sizeOk = Number.isInteger(size) && size >= 5 && size <= 150;

  function changeSource(next: SetupInput['source']) {
    setSource(next);
    setIds(next === 'mock' && mockPools[0] ? [mockPools[0].id] : []);
  }

  function changeMode(next: SetupInput['mode']) {
    setMode(next);
    if (!timerTouched) setTimer(initial.showTimer || next === 'test');
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (source === 'preset' && !isPreset(ids[0])) {
      setError('Choose a focus preset');
      return;
    }
    if (!sizeOk) {
      setError('Size must be a whole number from 5 to 150');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createPracticeSession({
        source,
        ids,
        size,
        mode,
        timer,
        order,
        prefer,
        multi,
      } satisfies SetupInput);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      <Card>
        <CardHeader title="What to practise" />
        <label className={ROW}>
          <span className={LABEL}>Source</span>
          <select
            className={FIELD}
            value={source}
            onChange={(e) => changeSource(e.target.value as SetupInput['source'])}
          >
            <option value="all">All</option>
            <option value="scenario">Scenario</option>
            <option value="domain">Domain</option>
            <option value="task">Task</option>
            <option value="preset">Focus preset</option>
            {mockPools.length > 0 && <option value="mock">New question set</option>}
          </select>
        </label>
        {source === 'preset' && (
          <fieldset className="mt-2 grid gap-1">
            <legend className="mb-1 text-sm font-semibold">Focus preset</legend>
            {presets.map((info) => (
              <label key={info.id} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="preset"
                  className="mt-1"
                  disabled={!info.available}
                  checked={ids[0] === info.id}
                  onChange={() => setIds([info.id])}
                />
                <span>
                  {presetLabel(
                    info,
                    matching(candidates, 'preset', [info.id], multi, presets, mockPools).length,
                  )}
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {source === 'mock' && (
          <fieldset className="mt-2 grid gap-1">
            <legend className="mb-1 text-sm font-semibold">New question set</legend>
            {mockPools.map((m) => (
              <label key={m.id} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="mock-pool"
                  className="mt-1"
                  checked={ids[0] === m.id}
                  onChange={() => setIds([m.id])}
                />
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span>{mockLabel(m.id)}</span>
                  <ProgressChip
                    id={m.id}
                    progress={countProgress(
                      matching(candidates, 'mock', [m.id], multi, presets, mockPools),
                    )}
                  />
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {source === 'scenario' && (
          <CheckGroup
            legend="Scenarios"
            options={props.scenarios.map((s) => ({
              id: s.id,
              label: `${s.id} ${s.name}`,
              progress: optionProgress(s.id),
            }))}
            ids={ids}
            onChange={setIds}
          />
        )}
        {source === 'domain' && (
          <CheckGroup
            legend="Domains"
            options={props.domains.map((d) => ({
              id: d.id,
              label: `${d.id} ${d.name}`,
              progress: optionProgress(d.id),
            }))}
            ids={ids}
            onChange={setIds}
          />
        )}
        {source === 'task' && (
          <CheckGroup
            legend="Tasks"
            options={props.tasks.map((k) => ({
              id: k.id,
              label: `${k.id} ${k.title}`,
              progress: optionProgress(k.id),
            }))}
            ids={ids}
            onChange={setIds}
          />
        )}
        <label className={`${ROW} mt-3`}>
          <span className={LABEL}>Prefer</span>
          <select
            className={FIELD}
            value={prefer}
            disabled={source === 'preset'}
            onChange={(e) => setPrefer(e.target.value as SetupInput['prefer'])}
          >
            <option value="unseen">Unseen first</option>
            <option value="weakest">Weakest first</option>
            <option value="random">Random</option>
          </select>
        </label>
        <label className={`${ROW} mt-3`}>
          <span className={LABEL}>Multiple-response</span>
          <select
            className={FIELD}
            value={multi}
            onChange={(e) => setMulti(e.target.value as SetupInput['multi'])}
          >
            <option value="yes">Include</option>
            <option value="only">Only</option>
            <option value="no">Exclude</option>
          </select>
        </label>
      </Card>

      <div className="space-y-4">
        <Card className="space-y-3">
          <CardHeader title="How" />
          <fieldset className={ROW}>
            <legend className="sr-only">Mode</legend>
            <span aria-hidden="true" className={LABEL}>
              Mode
            </span>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <label
                  key={m.value}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1 text-sm hover:bg-surface-2 has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
                >
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === m.value}
                    onChange={() => changeMode(m.value)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className={ROW}>
            <span className={LABEL}>Timer</span>
            <input
              type="checkbox"
              checked={timer}
              onChange={(e) => {
                setTimer(e.target.checked);
                setTimerTouched(true);
              }}
            />
            <span className="text-sm">2 minutes per question</span>
          </label>
          <label className={ROW}>
            <span className={LABEL}>Order</span>
            <select
              className={FIELD}
              value={order}
              onChange={(e) => setOrder(e.target.value as SetupInput['order'])}
            >
              <option value="group">Group by scenario</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
        </Card>

        <Card>
          <CardHeader title="Size" />
          <div className="flex flex-wrap items-center gap-2">
            <label className={ROW}>
              <span className={LABEL}>Size</span>
              <select
                className={FIELD}
                value={sizeChoice}
                onChange={(e) => setSizeChoice(e.target.value)}
              >
                {SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
            </label>
            {sizeChoice === 'custom' && (
              <input
                type="number"
                min={1}
                max={150}
                aria-label="Custom number of questions"
                className="w-24 min-w-0 rounded-lg border border-border bg-surface px-2 py-1.5"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
            )}
          </div>
          <p data-testid="available" className="mt-3 text-sm text-muted">
            {availableText(source, progress)}
          </p>
        </Card>

        {error && (
          <p role="alert" className="text-sm text-weak">
            {error}
          </p>
        )}
        <div>
          <Button type="submit" variant="primary" disabled={pending || !presetOk || !mockOk}>
            {pending ? 'Starting…' : 'Start'}
          </Button>
        </div>
      </div>
    </form>
  );
}
