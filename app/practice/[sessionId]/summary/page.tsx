import { Check, X } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { startMistakesReview } from '@/app/practice/actions';
import FeedbackPanel from '@/components/feedback/FeedbackPanel';
import { Button, Card, CardHeader, InlineText, Meter, Ring } from '@/components/ui';
import type { Tone } from '@/components/ui';
import {
  getFeedback,
  getSessionView,
  getSummary,
  TARGET_SECONDS_PER_QUESTION,
  type SummaryRow,
} from '@/lib/db/queries/sessions';

export const dynamic = 'force-dynamic';

function toneOf(accuracy: number): Tone {
  if (accuracy >= 0.72) return 'good';
  return accuracy >= 0.5 ? 'close' : 'weak';
}

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, '0')}s`;
}

function percent(x: number): string {
  return `${Math.round(x * 100)}%`;
}

function RowTable({ title, label, rows }: { title: string; label: string; rows: SummaryRow[] }) {
  return (
    <Card className="overflow-x-auto">
      <CardHeader title={title} />
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-1 pr-3">{label}</th>
            <th className="py-1 pr-3">Answered</th>
            <th className="py-1 pr-3">Correct</th>
            <th className="py-1">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border">
              <td className="py-1 pr-3">
                <span className="whitespace-nowrap font-mono">{r.id}</span> {r.name}
              </td>
              <td className="py-1 pr-3">{r.answered}</td>
              <td className="py-1 pr-3">{r.correct}</td>
              <td className="py-1">
                <div className="flex min-w-32 items-center gap-2">
                  <Meter
                    value={r.accuracy}
                    tone={toneOf(r.accuracy)}
                    label={`${r.name}: accuracy ${percent(r.accuracy)}`}
                  />
                  <span className="w-10 shrink-0 text-right">{percent(r.accuracy)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default async function SummaryPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const summary = getSummary(sessionId);
  if (!summary) {
    // Unknown id, or a session still in progress.
    if (getSessionView(sessionId)) redirect(`/practice/${sessionId}`);
    notFound();
  }
  const { total, answered, correct, calibration } = summary;
  const wrong = summary.items.filter((i) => !i.isCorrect).length;

  async function reviewMistakes() {
    'use server';
    await startMistakesReview(sessionId);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Session summary</h1>
      <Card className="flex flex-wrap items-center gap-5">
        <Ring
          value={total > 0 ? correct / total : 0}
          tone={toneOf(total > 0 ? correct / total : 0)}
        >
          <span className="text-lg font-semibold">{percent(total > 0 ? correct / total : 0)}</span>
        </Ring>
        <div className="min-w-0 space-y-1">
          <p data-testid="score" className="text-xl font-semibold">
            Score: {correct} / {total}
          </p>
          <p className="text-sm">
            {answered} answered
            {summary.timeUsedMs !== null && <> · time used {formatDuration(summary.timeUsedMs)}</>}
            {summary.meanSecondsPerQuestion !== null && (
              <>
                {' '}
                · {Math.round(summary.meanSecondsPerQuestion)} s per question (target{' '}
                {TARGET_SECONDS_PER_QUESTION} s)
              </>
            )}
            {summary.slowItems > 0 && <> · {summary.slowItems} over 180 s</>}
          </p>
          {summary.session.status === 'abandoned' && <p className="text-sm">Abandoned session.</p>}
        </div>
      </Card>

      <RowTable title="By domain" label="Domain" rows={summary.byDomain} />
      <RowTable title="By task" label="Task" rows={summary.byTask} />

      <Card>
        <CardHeader title="Traps you picked" />
        {summary.traps.length === 0 ? (
          <p className="text-sm">None.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm">
            {summary.traps.map((tr) => (
              <li key={tr.id}>
                <Link href={`/cheatsheet#trap-${tr.id}`} className="hover:underline">
                  {tr.name}
                </Link>{' '}
                × {tr.count}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-1 text-sm">
        <CardHeader title="Calibration" />
        <p>Blind spots (Sure but wrong): {calibration.blindSpots}</p>
        <p>Lucky guesses (Guess but right): {calibration.luckyGuesses}</p>
        <p>Unsure answers: {calibration.unsure}</p>
        <p>Added to the review queue: {summary.reviewEntered}</p>
      </Card>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Questions</h2>
        <ul className="space-y-2">
          {summary.items.map((i) => (
            <li key={i.position}>
              <details
                data-testid="summary-item"
                className="rounded-xl border border-border bg-surface p-3"
              >
                <summary className="cursor-pointer text-sm">
                  {i.isCorrect ? (
                    <Check size={16} aria-hidden="true" className="mr-1 inline text-good" />
                  ) : (
                    <X size={16} aria-hidden="true" className="mr-1 inline text-weak" />
                  )}
                  <span className="font-semibold">{i.position + 1}.</span>{' '}
                  {i.answered ? (i.isCorrect ? 'Correct' : 'Wrong') : 'No answer'}
                  {i.confidence && <> · {i.confidence}</>}
                  {i.timeMs !== null && <> · {Math.round(i.timeMs / 1000)} s</>}
                  {i.marked && <> · marked</>} ·{' '}
                  <InlineText text={i.stem.slice(0, 90) + (i.stem.length > 90 ? '…' : '')} />
                </summary>
                <FeedbackPanel feedback={getFeedback(i.questionId, i.selected, i.optionOrder)} />
              </details>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        {wrong > 0 && (
          <form action={reviewMistakes}>
            <Button type="submit" variant="primary">
              Review mistakes now
            </Button>
          </form>
        )}
        <Button variant="secondary" href="/report">
          Open full report
        </Button>
      </div>
    </div>
  );
}
