'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Flag, X } from 'lucide-react';
import {
  abandonSessionAction,
  finishSessionAction,
  submitAnswer,
  toggleMark,
} from '@/app/practice/actions';
import FeedbackPanel from '@/components/feedback/FeedbackPanel';
import type { SessionItemView } from '@/lib/db/queries/sessions';
import type { FeedbackData } from '@/lib/feedback';
import { Button, Card, Chip, ConfirmDialog, InlineText } from '@/components/ui';
import type { Confidence, Mode } from '@/lib/types';
import ConfidencePicker from './ConfidencePicker';
import OptionList from './OptionList';
import QuestionNavigator from './QuestionNavigator';
import ScenarioPanel from './ScenarioPanel';
import Timer from './Timer';
import { useShortcuts } from './useShortcuts';

// First unanswered position after `from`, wrapping to the start; null when none is left.
// `from` itself is never returned: it is the question being answered.
function nextPosition(answered: boolean[], from: number): number | null {
  for (let i = 1; i < answered.length; i++) {
    const p = (from + i) % answered.length;
    if (!answered[p]) return p;
  }
  return null;
}

export default function Runner(props: {
  sessionId: string;
  mode: Mode;
  total: number;
  item: SessionItemView;
  answered: boolean[];
  marked: boolean[];
  remainingMs: number | null;
  previousScenarioId: string | null;
  initialFeedback: FeedbackData | null;
}) {
  const { sessionId, mode, total, item, answered, remainingMs, previousScenarioId } = props;
  const test = mode === 'test';
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(item.selected ?? []);
  const [confidence, setConfidence] = useState<Confidence | null>(item.confidence);
  const [marked, setMarked] = useState(props.marked[item.position]);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData | null>(props.initialFeedback);
  // Study mode locks an answered question; test mode keeps it editable until the end.
  const [done, setDone] = useState(item.answered && !test);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<'finish' | 'abandon' | null>(null);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    shownAt.current = performance.now();
  }, []);

  const next = nextPosition(answered, item.position);
  const ready = selected.length === item.selectCount && confidence !== null;

  function goNext() {
    router.push(
      next === null ? `/practice/${sessionId}/summary` : `/practice/${sessionId}?pos=${next}`,
    );
  }

  const summaryUrl = `/practice/${sessionId}/summary`;
  const unanswered = answered.filter((a) => !a).length;
  const finishLabel = test ? 'Submit exam' : 'Finish session';
  const allAnswered = test && unanswered === 0;
  // The saved answer on screen has not been edited since it was stored.
  const unchanged =
    item.answered &&
    confidence === item.confidence &&
    selected.length === (item.selected ?? []).length &&
    selected.every((k) => item.selected?.includes(k));

  function toggleOption(index: number) {
    const o = item.options[index];
    if (done || !o) return;
    if (item.type === 'single') setSelected([o.key]);
    else
      setSelected((cur) =>
        cur.includes(o.key) ? cur.filter((k) => k !== o.key) : [...cur, o.key],
      );
  }

  function mark() {
    const value = !marked;
    setMarked(value);
    startTransition(async () => {
      const res = await toggleMark({ sessionId, position: item.position, marked: value });
      if (!res.ok) {
        setMarked(!value);
        setError(res.error);
      }
    });
  }

  const finishDetail = test ? 'They will count as wrong.' : 'They will be dropped.';

  function finish() {
    if (unanswered > 0) {
      setDialog('finish');
      return;
    }
    confirmFinish();
  }

  function confirmFinish() {
    setDialog(null);
    startTransition(async () => {
      const res = await finishSessionAction({ sessionId, reason: 'user' });
      if (!res.ok) setError(res.error);
      else router.push(summaryUrl);
    });
  }

  function confirmAbandon() {
    setDialog(null);
    startTransition(async () => {
      const res = await abandonSessionAction(sessionId);
      if (res && !res.ok) setError(res.error);
    });
  }

  function submit() {
    if (!confidence) return;
    const timeMs = Math.round(performance.now() - (shownAt.current ?? performance.now()));
    setError(null);
    startTransition(async () => {
      const res = await submitAnswer({
        sessionId,
        position: item.position,
        selected,
        confidence,
        timeMs,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.expired) {
        router.push(summaryUrl);
        return;
      }
      if (test) {
        setSaved(true);
        if (item.position + 1 < total)
          router.push(`/practice/${sessionId}?pos=${item.position + 1}`);
        else router.refresh();
        return;
      }
      setFeedback(res.feedback ?? null);
      setDone(true);
    });
  }

  useShortcuts({
    onOption: (i) => {
      if (!dialog) toggleOption(i);
    },
    onConfidence: (c) => {
      if (!done && !dialog) setConfidence(c);
    },
    onEnter: () => {
      if (pending || dialog) return;
      if (done) goNext();
      else if (ready && !(allAnswered && unchanged)) submit();
      else if (allAnswered && unchanged) confirmFinish();
    },
    onMark: () => {
      if (!dialog) mark();
    },
  });

  const navItems = answered.map((a, position) => ({
    position,
    answered: a,
    marked: position === item.position ? marked : props.marked[position],
  }));

  return (
    <div className="space-y-4">
      <Card as="header" className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="min-w-0 text-xl font-bold">{item.scenario.name}</h1>
        <div className="flex items-center gap-3">
          <Chip tone="accent">{test ? 'Test' : 'Study'}</Chip>
          {remainingMs !== null && <Timer sessionId={sessionId} remainingMs={remainingMs} />}
          <p data-testid="progress" className="text-sm text-muted">
            {item.position + 1} / {total}
          </p>
        </div>
      </Card>
      {test && <QuestionNavigator sessionId={sessionId} items={navItems} current={item.position} />}
      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-4 lg:space-y-0">
        <div className="lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
          <ScenarioPanel
            scenario={item.scenario}
            defaultOpen={item.scenario.id !== previousScenarioId}
          />
        </div>
        <div className="min-w-0 space-y-4">
          <p className="whitespace-pre-wrap text-lg">
            <InlineText text={item.stem} />
          </p>

          <OptionList
            options={item.options}
            type={item.type}
            selectCount={item.selectCount}
            selected={selected}
            onChange={setSelected}
            disabled={done}
            results={done ? feedback?.options : undefined}
          />
          <ConfidencePicker value={confidence} onChange={setConfidence} disabled={done} />
          {/* Everything above keeps its size after a submit, so Next lands where Submit was. */}
          <div className="flex h-10 items-center gap-2">
            {done ? (
              <Button type="button" variant="primary" onClick={goNext}>
                {next === null ? 'Finish' : 'Next'}
              </Button>
            ) : (
              <Button type="button" variant="primary" onClick={submit} disabled={!ready || pending}>
                Submit
              </Button>
            )}
            {done && feedback && (
              <Button
                type="button"
                variant="secondary"
                aria-expanded={reasoningOpen}
                onClick={() => setReasoningOpen((v) => !v)}
                icon={
                  <ChevronRight
                    size={16}
                    aria-hidden="true"
                    className={`shrink-0 transition-transform ${reasoningOpen ? 'rotate-90' : ''}`}
                  />
                }
              >
                {reasoningOpen ? 'Hide reasoning' : 'Show reasoning'}
              </Button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-weak">
              {error}
            </p>
          )}
          {allAnswered && (
            <div data-testid="all-answered" role="status" className="space-y-2">
              <p>All {total} answered. Submit to see your results.</p>
              <Button type="button" variant="primary" onClick={confirmFinish} disabled={pending}>
                Submit exam
              </Button>
            </div>
          )}
          {saved && !allAnswered && <p className="text-sm">Answer saved.</p>}
          {done && !feedback && <p>This question is already answered.</p>}
          {done && feedback && <FeedbackPanel feedback={feedback} reasoningOpen={reasoningOpen} />}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {test && (
          <>
            {item.position > 0 ? (
              <Button variant="secondary" href={`/practice/${sessionId}?pos=${item.position - 1}`}>
                Previous
              </Button>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold opacity-50"
              >
                Previous
              </span>
            )}
            {item.position + 1 < total ? (
              <Button variant="secondary" href={`/practice/${sessionId}?pos=${item.position + 1}`}>
                Next
              </Button>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold opacity-50"
              >
                Next
              </span>
            )}
          </>
        )}
        <Button type="button" variant="secondary" onClick={mark} aria-pressed={marked}>
          {marked ? 'Marked to learn later' : 'Mark to learn later'}
        </Button>
        <Button
          type="button"
          variant={allAnswered ? 'primary' : 'ghost'}
          icon={<Flag size={16} aria-hidden="true" />}
          onClick={finish}
          disabled={pending}
          data-testid="finish-button"
        >
          {finishLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          icon={<X size={16} aria-hidden="true" />}
          onClick={() => setDialog('abandon')}
          disabled={pending}
        >
          Abandon
        </Button>
      </div>
      <ConfirmDialog
        open={dialog === 'finish'}
        title={test ? 'Submit exam?' : 'Finish session?'}
        body={`${unanswered} unanswered. ${finishDetail}`}
        confirmLabel={test ? 'Submit' : 'Finish'}
        onConfirm={confirmFinish}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'abandon'}
        title="Abandon this session?"
        body="Unanswered questions are dropped."
        confirmLabel="Abandon"
        tone="danger"
        onConfirm={confirmAbandon}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
