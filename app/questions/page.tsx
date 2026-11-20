import Link from 'next/link';
import { Search } from 'lucide-react';
import { Button, Card, Chip, EmptyState, InlineText } from '@/components/ui';
import { getDomains, getScenarios, getTasks } from '@/lib/db/queries/catalog';
import { PAGE_SIZE, searchQuestions, type QuestionFilters } from '@/lib/db/queries/questions';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | undefined>;

const FIELD =
  'w-full min-w-0 rounded-lg border border-border bg-surface px-2 py-1.5 text-fg focus-visible:outline-2 focus-visible:outline-accent';
const LINK = 'text-accent hover:underline';

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((a) => a === value);
}

function parseFilters(p: Params): QuestionFilters {
  const difficulty = Number(p.difficulty);
  const page = Number(p.page);
  return {
    scenario: p.scenario || undefined,
    domain: p.domain || undefined,
    task: p.task || undefined,
    type: pick(p.type, ['single', 'multi'] as const),
    difficulty:
      Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 5 ? difficulty : undefined,
    seen: pick(p.seen, ['seen', 'unseen'] as const),
    last: pick(p.last, ['right', 'wrong'] as const),
    flagged: p.flagged === '1',
    marked: p.marked === '1',
    q: p.q?.trim() || undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

function pageHref(p: Params, page: number): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v && k !== 'page') qs.set(k, v);
  qs.set('page', String(page));
  return `/questions?${qs.toString()}`;
}

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      {label}
      <select name={name} defaultValue={value ?? ''} className={FIELD}>
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const RESULT: Record<string, string> = { right: 'Right', wrong: 'Wrong' };

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const { rows, total } = searchQuestions(filters);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const shown = page === filters.page ? rows : searchQuestions({ ...filters, page }).rows;

  return (
    <>
      <h1 className="text-2xl font-bold">Questions</h1>
      <Card as="div" className="mt-4">
        <form
          method="get"
          className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-10"
          aria-label="Filters"
        >
          <Select
            name="scenario"
            label="Scenario"
            value={filters.scenario}
            options={getScenarios().map((s) => ({ value: s.id, label: `${s.id} ${s.name}` }))}
          />
          <Select
            name="domain"
            label="Domain"
            value={filters.domain}
            options={getDomains().map((d) => ({ value: d.id, label: `${d.id} ${d.name}` }))}
          />
          <Select
            name="task"
            label="Task"
            value={filters.task}
            options={getTasks().map((k) => ({ value: k.id, label: `${k.id} ${k.title}` }))}
          />
          <Select
            name="type"
            label="Type"
            value={filters.type}
            options={[
              { value: 'single', label: 'Single' },
              { value: 'multi', label: 'Multi' },
            ]}
          />
          <Select
            name="difficulty"
            label="Difficulty"
            value={filters.difficulty?.toString()}
            options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
          />
          <Select
            name="seen"
            label="Seen"
            value={filters.seen}
            options={[
              { value: 'seen', label: 'Seen' },
              { value: 'unseen', label: 'Unseen' },
            ]}
          />
          <Select
            name="last"
            label="Last result"
            value={filters.last}
            options={[
              { value: 'right', label: 'Right' },
              { value: 'wrong', label: 'Wrong' },
            ]}
          />
          <Select
            name="flagged"
            label="Flagged"
            value={filters.flagged ? '1' : undefined}
            options={[{ value: '1', label: 'Flagged' }]}
          />
          <Select
            name="marked"
            label="Marked"
            value={filters.marked ? '1' : undefined}
            options={[{ value: '1', label: 'Marked' }]}
          />
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            Search
            <input type="search" name="q" defaultValue={filters.q ?? ''} className={FIELD} />
          </label>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary">
              Apply
            </Button>
            <Link href="/questions" className={`${LINK} text-sm`}>
              Clear
            </Link>
          </div>
        </form>
      </Card>

      <p data-testid="question-count" className="mt-4 text-sm text-muted">
        {total} {total === 1 ? 'question' : 'questions'}
      </p>
      {shown.length === 0 ? (
        <div className="mt-2">
          <EmptyState icon={Search} title="No questions match these filters">
            Try clearing a filter or searching for something else.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="px-3 py-2">ID</th>
                <th className="pr-3">Scenario</th>
                <th className="pr-3">Task</th>
                <th className="pr-3">Type</th>
                <th className="hidden pr-3 lg:table-cell">Question</th>
                <th className="pr-3">Difficulty</th>
                <th className="pr-3">Last result</th>
                <th className="pr-3">Flag</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} data-testid="question-row" className="border-b border-border">
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono">
                    <Link href={`/questions/${r.id}`} className={LINK} title={r.stem}>
                      {r.id}
                    </Link>
                  </td>
                  <td className="pr-3">{r.scenarioId}</td>
                  <td className="pr-3">{r.primaryTaskId}</td>
                  <td className="pr-3">{r.type}</td>
                  <td className="hidden w-full max-w-0 truncate pr-3 lg:table-cell">
                    {r.stem.includes('`') ? <InlineText text={r.stem} /> : r.stem}
                  </td>
                  <td className="pr-3">{r.difficulty}</td>
                  <td className="pr-3">{r.lastResult ? RESULT[r.lastResult] : '-'}</td>
                  <td className="pr-3">
                    {r.flagged && (
                      <span role="img" aria-label="Flagged">
                        🚩
                      </span>
                    )}
                    {r.marked && <Chip tone="accent">Marked</Chip>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link href={pageHref(params, page - 1)} className={LINK}>
              Previous
            </Link>
          )}
          <span data-testid="page-info">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={pageHref(params, page + 1)} className={LINK}>
              Next
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
