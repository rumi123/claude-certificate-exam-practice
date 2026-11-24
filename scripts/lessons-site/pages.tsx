// Static pages for the read-only lessons site (scripts/build-lessons-site.tsx).
// No next/* imports: these are rendered with react-dom/server outside Next.
// Links are relative so the site works under any path (GitHub Pages serves it from /<repo>/).
import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Circle, Lightbulb, TriangleAlert } from 'lucide-react';
import TeachingSection from '@/components/feedback/TeachingSection';
import { Card, Chip, InlineText } from '@/components/ui';
import type { FeedbackData } from '@/lib/feedback';

export type QuestionLink = { id: string; href: string; stem: string };

export type IndexGroup = {
  title: string;
  subtitle?: string;
  sections: { title: string; questions: QuestionLink[] }[];
};

export type QuestionPageData = {
  id: string;
  source: string;
  scenario: { name: string; setup: string } | null;
  stem: string;
  selectCount: number;
  feedback: FeedbackData;
  prev: QuestionLink | null;
  next: QuestionLink | null;
};

export function Document({
  title,
  css,
  children,
}: {
  title: string;
  css: string;
  children: ReactNode;
}) {
  return (
    <html lang="en" data-theme="system">
      {/* Rendered with react-dom/server outside Next, so next/head does not apply. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link rel="stylesheet" href={css} />
      </head>
      <body className="min-h-screen bg-bg text-fg">
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

function shortStem(stem: string): string {
  const flat = stem.replace(/\s+/g, ' ').trim();
  return flat.length > 110 ? `${flat.slice(0, 107)}…` : flat;
}

export function toLink(id: string, href: string, stem: string): QuestionLink {
  return { id, href, stem: shortStem(stem) };
}

export function IndexPage({ groups, total }: { groups: IndexGroup[]; total: number }) {
  return (
    <>
      <h1 className="text-2xl font-bold">CCAR-F lessons</h1>
      <p className="mt-1 text-muted">
        {total} questions with their answers and lessons. Read-only; open a domain to start.
      </p>
      {groups.map((g) => (
        <section key={g.title} className="mt-8">
          <h2 className="text-xl font-semibold">{g.title}</h2>
          {g.subtitle && <p className="mt-1 text-sm text-muted">{g.subtitle}</p>}
          <div className="mt-3 space-y-3">
            {g.sections.map((s) => (
              <details
                key={s.title}
                data-testid="index-section"
                className="rounded-xl border border-border bg-surface p-4"
              >
                <summary className="cursor-pointer font-semibold">
                  {s.title}{' '}
                  <span className="text-sm font-normal text-muted">({s.questions.length})</span>
                </summary>
                <ul className="mt-3 space-y-2">
                  {s.questions.map((q) => (
                    <li key={q.id}>
                      <a href={q.href} className="block rounded-lg p-2 hover:bg-surface-2">
                        <span className="font-mono text-sm font-semibold text-accent">{q.id}</span>
                        <span className="mt-0.5 block text-sm text-muted">
                          <InlineText text={q.stem} />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function PrevNext({ prev, next }: { prev: QuestionLink | null; next: QuestionLink | null }) {
  const cls =
    'inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-surface-2';
  return (
    <nav aria-label="Question navigation" className="flex items-center justify-between gap-2">
      {prev ? (
        <a href={prev.href} className={cls}>
          <ArrowLeft size={14} aria-hidden="true" /> {prev.id}
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a href={next.href} className={cls}>
          {next.id} <ArrowRight size={14} aria-hidden="true" />
        </a>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function QuestionPage({ data, indexHref }: { data: QuestionPageData; indexHref: string }) {
  const { feedback } = data;
  return (
    <>
      <p className="text-sm">
        <a href={indexHref} className="inline-flex items-center gap-1 text-accent hover:underline">
          <ArrowLeft size={14} aria-hidden="true" />
          All lessons
        </a>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="whitespace-nowrap text-2xl font-bold">{data.id}</h1>
        <Chip tone="neutral">{data.source}</Chip>
        <Chip tone="accent">{feedback.tags.primaryTask.id}</Chip>
      </div>

      {data.scenario && (
        <details className="mt-4 rounded-xl border border-border bg-surface p-4">
          <summary className="cursor-pointer font-semibold">
            Scenario: {data.scenario.name}
          </summary>
          <p className="mt-2 whitespace-pre-line text-sm">
            <InlineText text={data.scenario.setup} />
          </p>
        </details>
      )}

      <p data-testid="stem" className="mt-4 whitespace-pre-line text-lg">
        <InlineText text={data.stem} />
      </p>
      {data.selectCount > 1 && (
        <p className="mt-1 text-sm text-muted">Select {data.selectCount}</p>
      )}

      <ul className="mt-4 space-y-2">
        {feedback.options.map((o) => (
          <li
            key={o.key}
            data-testid="option"
            className="flex gap-3 rounded-xl border border-border bg-surface p-3"
          >
            {o.isCorrect ? (
              <Check
                size={18}
                role="img"
                aria-label="Correct option"
                className="mt-0.5 shrink-0 text-good"
              />
            ) : (
              <Circle size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                <span>
                  {o.letter}. <InlineText text={o.text} />
                </span>
                {!o.isCorrect && o.trap && (
                  <Chip tone="close" title={o.trap.description}>
                    <TriangleAlert size={12} aria-hidden="true" />
                    {o.trap.name}
                  </Chip>
                )}
              </p>
              <div className="mt-1">
                <Chip tone={o.isCorrect ? 'good' : 'weak'}>
                  {o.isCorrect ? 'Correct' : 'Wrong'}
                </Chip>
              </div>
              <p className="mt-1 text-base text-muted">
                <InlineText text={o.reasoning ?? o.explanation} />
              </p>
              {o.tempting && (
                <p className="mt-1 text-base text-muted">
                  <span className="font-semibold">Why it was tempting.</span>{' '}
                  <InlineText text={o.tempting} />
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Card className="mt-4 flex gap-3 bg-accent-soft">
        <Lightbulb size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
        <p>
          <span className="font-semibold">Key concept:</span>{' '}
          <InlineText text={feedback.keyConcept} />
        </p>
      </Card>

      {feedback.lesson && (
        <div className="mt-4">
          <TeachingSection lesson={feedback.lesson} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Chip tone="neutral">{feedback.tags.scenario}</Chip>
        <Chip tone="neutral">{feedback.tags.domain}</Chip>
        <Chip tone="accent">
          {feedback.tags.primaryTask.id} {feedback.tags.primaryTask.title}
        </Chip>
        {feedback.tags.secondaryTasks.map((k) => (
          <Chip key={k.id} tone="neutral">
            {k.id} {k.title}
          </Chip>
        ))}
        <Chip tone="neutral">Difficulty {feedback.tags.difficulty}</Chip>
      </div>

      <div className="mt-8 border-t border-border pt-4">
        <PrevNext prev={data.prev} next={data.next} />
      </div>
    </>
  );
}
