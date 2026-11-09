import { Check, Circle, CircleAlert, CircleCheck, CircleX, Lightbulb, X } from 'lucide-react';
import { Button, Card, Chip, InlineText } from '@/components/ui';
import type { Tone } from '@/components/ui';
import { bannerText, type FeedbackData } from '@/lib/feedback';
import AskClaudeButton from './AskClaudeButton';
import FlagForm from './FlagForm';
import TrapBadge from './TrapBadge';

type Result = NonNullable<FeedbackData['result']>;

function OptionMark({ o }: { o: FeedbackData['options'][number] }) {
  if (o.isCorrect) {
    return (
      <Check
        size={18}
        role="img"
        aria-label="Correct option"
        className="mt-0.5 shrink-0 text-good"
      />
    );
  }
  if (o.selected) {
    return (
      <X
        size={18}
        role="img"
        aria-label="Your answer, incorrect"
        className="mt-0.5 shrink-0 text-weak"
      />
    );
  }
  return <Circle size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />;
}

function banner(result: Result): { tone: Tone; Icon: typeof CircleCheck; cls: string } {
  if (result.isCorrect) return { tone: 'good', Icon: CircleCheck, cls: 'bg-good-soft text-good' };
  if (result.correctSelected > 0 && result.selectCount > 1) {
    return { tone: 'close', Icon: CircleAlert, cls: 'bg-close-soft text-close' };
  }
  return { tone: 'weak', Icon: CircleX, cls: 'bg-weak-soft text-weak' };
}

export default function FeedbackPanel({ feedback }: { feedback: FeedbackData }) {
  const { questionId, result, options, keyConcept, tags, links } = feedback;
  const b = result ? banner(result) : null;
  return (
    <section aria-label="Feedback" className="mt-4 space-y-4">
      {result && b && (
        <p
          role="status"
          className={`flex items-center gap-2 rounded-xl px-3 py-2 font-semibold ${b.cls}`}
        >
          <b.Icon size={20} aria-hidden="true" className="shrink-0" />
          {bannerText(result)}
        </p>
      )}
      <ul className="space-y-2">
        {options.map((o) => (
          <li
            key={o.key}
            data-testid="feedback-option"
            className="flex gap-3 rounded-xl border border-border bg-surface p-3"
          >
            <OptionMark o={o} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                <span>
                  {o.letter}. <InlineText text={o.text} />
                </span>
                {!o.isCorrect && o.trap && <TrapBadge trap={o.trap} />}
              </p>
              <p className="mt-1 text-base text-muted">
                <InlineText text={o.explanation} />
              </p>
            </div>
          </li>
        ))}
      </ul>
      <Card className="flex gap-3 bg-accent-soft">
        <Lightbulb size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
        <p>
          <span className="font-semibold">Key concept:</span> <InlineText text={keyConcept} />
        </p>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="neutral">{tags.scenario}</Chip>
        <Chip tone="neutral">{tags.domain}</Chip>
        <Chip tone="accent" data-testid="task-tag">
          {tags.primaryTask.id} {tags.primaryTask.title}
        </Chip>
        {tags.secondaryTasks.map((k) => (
          <Chip key={k.id} tone="neutral">
            {k.id} {k.title}
          </Chip>
        ))}
        <Chip tone="neutral">Difficulty {tags.difficulty}</Chip>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button variant="secondary" size="sm" href={links.research}>
          Read
        </Button>
        {links.lesson && (
          <a
            href={links.lesson}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1 text-sm font-semibold text-fg hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Lesson
          </a>
        )}
        <AskClaudeButton />
        <FlagForm questionId={questionId} />
      </div>
    </section>
  );
}
