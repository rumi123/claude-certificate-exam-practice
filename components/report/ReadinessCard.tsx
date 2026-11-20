import type { Report } from '@/lib/report/build-report';
import { plural } from '@/lib/format/plural';
import { Card, Chip, Ring } from '@/components/ui';
import type { Tone } from '@/components/ui';
import Sparkline from './Sparkline';
import { pct } from './format';

const TOOLTIP = "Anthropic doesn't publish the raw cut-off. This estimate assumes 72% maps to 720.";

function headline(score: number, totalAnswers: number): string {
  if (totalAnswers === 0) return 'No answers yet';
  return score >= 720 ? 'Above the pass line' : `${720 - score} points to pass`;
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

export default function ReadinessCard({
  summary,
  compact = false,
}: {
  summary: Report['summary'];
  compact?: boolean;
}) {
  const tone: Tone = summary.score >= 720 ? 'good' : summary.score >= 650 ? 'close' : 'weak';
  return (
    <Card as="div" data-testid="readiness">
      <div className={compact ? undefined : 'lg:flex lg:items-center lg:gap-8'}>
        <div className="flex items-center gap-4">
          <Ring value={summary.score / 1000} tone={tone} tickAt={0.72}>
            <span data-testid="readiness-score" className="text-2xl font-bold">
              {summary.score}
            </span>
          </Ring>
          <div className="min-w-0">
            <p className="text-lg font-semibold">{headline(summary.score, summary.totalAnswers)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Chip tone={tone} data-testid="readiness-label">
                {summary.label}
              </Chip>
              <span title={TOOLTIP} className="cursor-help text-sm underline decoration-dotted">
                Estimate
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">of 1000, pass line 720</p>
            <p className="text-sm">{plural(summary.totalAnswers, 'question')} answered</p>
          </div>
        </div>
        {!compact && (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:mt-0 lg:flex-1">
            <Stat label="Accuracy">{pct(summary.accuracy)}</Stat>
            <Stat label="Calibration">{pct(summary.calibrationScore)}</Stat>
            <Stat label="Due for review">{summary.dueCount}</Stat>
            <Stat label="Last 5 sessions">
              <Sparkline points={summary.trend} />
            </Stat>
          </dl>
        )}
      </div>
    </Card>
  );
}
