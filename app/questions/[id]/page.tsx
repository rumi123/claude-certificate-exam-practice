import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import FeedbackPanel from '@/components/feedback/FeedbackPanel';
import { Card, Chip, InlineText } from '@/components/ui';
import { getQuestionWithOptions, getScenarios } from '@/lib/db/queries/catalog';
import { getQuestionHistory } from '@/lib/db/queries/questions';
import { getFeedback } from '@/lib/db/queries/sessions';

export const dynamic = 'force-dynamic';

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = getQuestionWithOptions(id);
  if (!q || q.pool !== 'practice') notFound();
  const scenario = getScenarios().find((s) => s.id === q.scenarioId);
  const feedback = getFeedback(
    id,
    [],
    q.options.map((o) => o.key),
  );
  const history = getQuestionHistory(id);

  return (
    <>
      <p className="text-sm">
        <Link
          href="/questions"
          className="inline-flex items-center gap-1 text-accent hover:underline"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to questions
        </Link>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="whitespace-nowrap text-2xl font-bold">{q.id}</h1>
        <Chip tone="neutral">{feedback.tags.domain}</Chip>
        <Chip tone="accent">{feedback.tags.primaryTask.id}</Chip>
      </div>
      {scenario && (
        <Card aria-label="Scenario" className="mt-4">
          <h2 className="font-semibold">{scenario.name}</h2>
          <p data-testid="scenario-setup" className="mt-1 whitespace-pre-line text-sm">
            <InlineText text={scenario.setup} />
          </p>
        </Card>
      )}
      <p data-testid="stem" className="mt-4 whitespace-pre-line text-lg">
        <InlineText text={q.stem} />
      </p>
      {q.type === 'multi' && <p className="mt-1 text-sm text-muted">Select {q.selectCount}</p>}
      <FeedbackPanel feedback={feedback} />
      <section aria-label="History" className="mt-8">
        <h2 className="text-lg font-semibold">Your answers</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Not answered yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-1 pr-3">Date</th>
                  <th className="pr-3">Session</th>
                  <th className="pr-3">Answer</th>
                  <th className="pr-3">Result</th>
                  <th className="pr-3">Confidence</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} data-testid="history-row">
                    <td className="py-1 pr-3">{new Date(h.answeredAt).toLocaleString()}</td>
                    <td className="pr-3">{h.kind}</td>
                    <td className="pr-3">{h.letters.join(', ') || '-'}</td>
                    <td className="pr-3">{h.isCorrect ? 'Correct' : 'Wrong'}</td>
                    <td className="pr-3">{h.confidence ?? '-'}</td>
                    <td>{h.timeMs === null ? '-' : `${Math.round(h.timeMs / 1000)} s`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
