import { notFound, redirect } from 'next/navigation';
import Runner from '@/components/runner/Runner';
import { now } from '@/lib/clock';
import {
  deadlineOf,
  finishIfExpired,
  getFeedback,
  getSessionView,
} from '@/lib/db/queries/sessions';

export const dynamic = 'force-dynamic';

export default async function RunnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ pos?: string }>;
}) {
  const { sessionId } = await params;
  const { pos } = await searchParams;
  if (finishIfExpired(sessionId)) redirect(`/practice/${sessionId}/summary`);
  const view = getSessionView(sessionId);
  if (!view) notFound();
  const summary = `/practice/${sessionId}/summary`;
  if (view.session.status !== 'in_progress') redirect(summary);

  const { items } = view;
  const asked = pos === undefined ? NaN : Number(pos);
  const position = Number.isInteger(asked) && asked >= 0 && asked < items.length ? asked : -1;
  // Test mode stays open when everything is answered: the user finishes it explicitly.
  const firstOpen = items.findIndex((i) => !i.answered);
  const index = position >= 0 ? position : firstOpen >= 0 ? firstOpen : 0;
  if (items.length === 0) redirect(summary);

  const item = items[index];
  const deadline = deadlineOf(view.session);
  const feedback =
    item.answered && view.session.mode === 'study' && item.selected
      ? getFeedback(item.questionId, item.selected, item.optionOrder)
      : null;

  return (
    <Runner
      key={item.position}
      sessionId={sessionId}
      mode={view.session.mode as 'study' | 'test'}
      total={items.length}
      item={item}
      answered={items.map((i) => i.answered)}
      marked={items.map((i) => i.marked)}
      remainingMs={deadline === null ? null : Math.max(0, deadline - now())}
      previousScenarioId={index > 0 ? items[index - 1].scenario.id : null}
      initialFeedback={feedback}
    />
  );
}
