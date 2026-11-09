import Link from 'next/link';
import { ListChecks, Play, RotateCcw } from 'lucide-react';
import DrillButton from '@/components/DrillButton';
import DomainBars from '@/components/report/DomainBars';
import ReadinessCard from '@/components/report/ReadinessCard';
import StatusBadge from '@/components/report/StatusBadge';
import { EMPTY_TASKS, pct } from '@/components/report/format';
import { Button, Card, CardHeader, EmptyState, IconTile, Meter } from '@/components/ui';
import { now } from '@/lib/clock';
import { getBankCoverage, getContinueSession } from '@/lib/db/queries/dashboard';
import { loadReport } from '@/lib/db/queries/report';

export const dynamic = 'force-dynamic';

const MUTED = 'text-sm text-muted';

export default function DashboardPage() {
  const report = loadReport(now());
  const cont = getContinueSession();
  const coverage = getBankCoverage();
  const top3 = report.studyAgain;
  const dueCount = report.summary.dueCount;

  const tested = report.domains.filter((d) => d.status !== 'untested' && d.mastery !== null);
  const weakest = tested.reduce<(typeof tested)[number] | null>(
    (lo, d) => (lo === null || d.mastery! < lo.mastery! ? d : lo),
    null,
  );
  const weakestTask = weakest
    ? weakest.tasks
        .filter((t) => t.status !== 'untested' && t.mastery !== null)
        .reduce<(typeof weakest.tasks)[number] | null>(
          (lo, t) => (lo === null || t.mastery! < lo.mastery! ? t : lo),
          null,
        )
    : null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className={MUTED}>Your readiness, what is due, and where to focus next.</p>
        </div>
        <Button variant="primary" href="/practice" icon={<Play size={16} aria-hidden="true" />}>
          Start practice
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <section aria-labelledby="readiness">
          <h2 id="readiness" className="sr-only">
            Readiness
          </h2>
          <ReadinessCard summary={report.summary} compact />
        </section>

        <div className="grid gap-4 md:col-span-2">
          <Card aria-labelledby="due">
            <div className="flex items-center gap-3">
              <IconTile icon={RotateCcw} tone="accent" />
              <div className="min-w-0 flex-1">
                <h2 id="due" className="text-lg font-semibold">
                  Due today
                </h2>
                <p data-testid="dash-due" className={MUTED}>
                  {dueCount} review {dueCount === 1 ? 'question' : 'questions'}
                </p>
              </div>
              <Button variant="secondary" href="/review">
                Start review
              </Button>
            </div>
          </Card>

          <Card aria-labelledby="continue">
            <div className="flex items-center gap-3">
              <IconTile icon={Play} tone="good" />
              <div className="min-w-0 flex-1">
                <h2 id="continue" className="text-lg font-semibold">
                  Continue
                </h2>
                {cont ? (
                  <p data-testid="dash-continue" className="text-sm">
                    <Link
                      href={`/practice/${cont.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      Continue {cont.kind} session
                    </Link>{' '}
                    <span className="text-muted">
                      {cont.answered} / {cont.total} answered
                    </span>
                  </p>
                ) : (
                  <p className={MUTED}>No session in progress</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-4" aria-labelledby="domains">
        <CardHeader title="Domains" id="domains" />
        <DomainBars domains={report.domains} withTasks={false} />
        {weakest && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <p className="min-w-0 truncate text-sm">
              Weakest: {weakest.id} {weakest.name} {pct(weakest.mastery)}
            </p>
            {weakestTask && (
              <DrillButton taskId={weakestTask.id} label={`Drill task ${weakestTask.id}`} />
            )}
          </div>
        )}
      </Card>

      <Card className="mt-4" aria-labelledby="top3">
        <CardHeader title="Study again" id="top3" />
        {top3.length > 0 ? (
          <ol className="space-y-2">
            {top3.map((p) => (
              <li
                key={p.taskId}
                data-testid="top3-item"
                data-task={p.taskId}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="min-w-0 flex-1 font-medium">
                  {p.taskId} {p.title}
                  {p.reasons[0] && <span className={`ml-2 ${MUTED}`}>{p.reasons[0]}</span>}
                </span>
                <StatusBadge status={p.status} />
                <DrillButton taskId={p.taskId} label="Drill" />
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState icon={ListChecks} title={EMPTY_TASKS} />
        )}
      </Card>

      <Card className="mt-4" aria-labelledby="coverage">
        <CardHeader title="Bank coverage" id="coverage" />
        <p data-testid="coverage-total" className="text-lg font-semibold">
          {coverage.seen} / {coverage.total}
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {coverage.perScenario.map((s) => (
            <li key={s.id} data-testid="coverage-scenario" className="min-w-0 text-sm">
              <div className="truncate">
                {s.id} {s.name}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Meter
                  value={s.total === 0 ? 0 : s.seen / s.total}
                  tone="accent"
                  passLine={null}
                  height={6}
                  label={`${s.name}: ${s.seen} of ${s.total} seen`}
                />
                <span className="shrink-0 text-muted">
                  {s.seen} / {s.total}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
