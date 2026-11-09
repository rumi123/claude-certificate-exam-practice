import type { LucideIcon } from 'lucide-react';
import {
  ChartColumn,
  Crosshair,
  Gauge,
  Layers,
  ListTodo,
  Target,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import Calibration from '@/components/report/Calibration';
import DomainBars from '@/components/report/DomainBars';
import PriorityList from '@/components/report/PriorityList';
import ReadinessCard from '@/components/report/ReadinessCard';
import ScenarioTable from '@/components/report/ScenarioTable';
import TaskTable from '@/components/report/TaskTable';
import Timing from '@/components/report/Timing';
import TrapProfile from '@/components/report/TrapProfile';
import { EMPTY_DATA, EMPTY_TASKS, EMPTY_TRAPS } from '@/components/report/format';
import { Card, CardHeader, EmptyState } from '@/components/ui';
import { now } from '@/lib/clock';
import { getTasks } from '@/lib/db/queries/catalog';
import { loadReport } from '@/lib/db/queries/report';

export const dynamic = 'force-dynamic';

function Empty({ id, text, icon = ChartColumn }: { id: string; text: string; icon?: LucideIcon }) {
  return <EmptyState testId={`empty-${id}`} icon={icon} title={text} />;
}

function Section({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  const Icon = icon;
  return (
    <Card aria-labelledby={id} data-testid={`section-${id}`}>
      <CardHeader
        id={id}
        icon={<Icon size={18} aria-hidden="true" className="text-muted" />}
        title={title}
      />
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

export default function ReportPage() {
  const report = loadReport(now());
  const tasks = getTasks();
  const hasAnswers = report.summary.totalAnswers > 0;
  const tested = report.tasks.some((t) => t.status !== 'untested');
  const hasPriorities = hasAnswers && report.priorities.length > 0;
  const domainNames = Object.fromEntries(report.domains.map((d) => [d.id, d.name]));
  const taskTitles = Object.fromEntries(tasks.map((t) => [t.id, t.title]));
  const lessonUrls = Object.fromEntries(tasks.map((t) => [t.id, t.lessonUrl]));

  return (
    <>
      <h1 className="text-2xl font-bold">Report</h1>

      <section className="mt-6" aria-labelledby="summary" data-testid="section-summary">
        <h2 id="summary" className="sr-only">
          Summary
        </h2>
        <ReadinessCard summary={report.summary} />
        {!hasAnswers && (
          <div className="mt-3">
            <Empty id="summary" text={EMPTY_DATA} />
          </div>
        )}
      </section>

      <div className="mt-6 space-y-6">
        <Section id="improve" title="What to improve" icon={ListTodo}>
          {hasPriorities ? (
            <PriorityList
              entries={report.priorities}
              domainNames={domainNames}
              lessonUrls={lessonUrls}
            />
          ) : (
            <Empty id="improve" text={EMPTY_TASKS} icon={Target} />
          )}
        </Section>

        <Section id="domains" title="Domains" icon={Layers}>
          {!hasAnswers && <Empty id="domains" text={EMPTY_DATA} />}
          <DomainBars domains={report.domains} />
        </Section>

        <Section id="tasks" title="Task statements" icon={Target}>
          {!tested && <Empty id="tasks" text={EMPTY_TASKS} icon={Target} />}
          <TaskTable rows={report.tasks} />
        </Section>

        <Section id="traps" title="Trap profile" icon={TriangleAlert}>
          {report.traps.length > 0 ? (
            <TrapProfile traps={report.traps} />
          ) : (
            <Empty id="traps" text={EMPTY_TRAPS} icon={Target} />
          )}
        </Section>

        <Section id="calibration" title="Calibration" icon={Crosshair}>
          {report.calibration.score === null && report.calibration.luckyGuesses === 0 ? (
            <Empty id="calibration" text={EMPTY_DATA} />
          ) : (
            <Calibration calibration={report.calibration} taskTitles={taskTitles} />
          )}
        </Section>

        <Section id="timing" title="Timing" icon={Timer}>
          {report.timing.overall.n > 0 ? (
            <Timing timing={report.timing} domainNames={domainNames} />
          ) : (
            <Empty id="timing" text={EMPTY_DATA} />
          )}
        </Section>

        <Section id="scenarios" title="Scenarios" icon={Gauge}>
          {!hasAnswers && <Empty id="scenarios" text={EMPTY_DATA} />}
          <ScenarioTable scenarios={report.scenarios} />
        </Section>
      </div>
    </>
  );
}
