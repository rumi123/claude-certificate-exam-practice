import { CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { Button, Card, EmptyState } from '@/components/ui';
import { now } from '@/lib/clock';
import { getReviewStats } from '@/lib/db/queries/review';
import { startReview } from './actions';

export const dynamic = 'force-dynamic';

export default function ReviewPage() {
  const at = now();
  const stats = getReviewStats(at);
  const inQueue = stats.perBox.reduce((a, b) => a + b, 0);
  const empty = stats.dueNow === 0;
  async function start() {
    'use server';
    await startReview();
  }
  return (
    <>
      <h1 className="text-2xl font-bold">Review</h1>
      <Card className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <p data-testid="due-count" className="text-2xl font-semibold">
          {stats.dueNow} due
        </p>
        <form action={start}>
          <Button type="submit" variant="primary" disabled={empty}>
            Start review
          </Button>
        </form>
      </Card>
      <ul
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        aria-label="Questions per box"
      >
        {stats.perBox.map((n, i) => (
          <li key={i} data-testid={`box-${i + 1}`}>
            <Card as="div" className="text-sm text-muted">
              Box {i + 1}: <span className="text-lg font-semibold text-fg">{n}</span>
            </Card>
          </li>
        ))}
        <li>
          <Card as="div" className="text-sm text-muted">
            Retired: <span className="text-lg font-semibold text-fg">{stats.retired}</span>
          </Card>
        </li>
      </ul>
      {empty && (
        <div className="mt-6">
          <EmptyState
            testId="review-empty"
            icon={CircleCheck}
            title={
              stats.nextDueAt !== null
                ? `Nothing due. Next review: ${new Date(stats.nextDueAt).toLocaleString()}`
                : inQueue + stats.retired === 0
                  ? 'No questions in the queue yet'
                  : 'Nothing due.'
            }
            action={
              <Link href="/practice?preset=weak" className="text-sm underline underline-offset-2">
                Drill weak areas
              </Link>
            }
          />
        </div>
      )}
    </>
  );
}
