import { Card, Chip, InlineText } from '@/components/ui';
import { getLearnOutline } from '@/lib/db/queries/learn';
import { SOURCE_LABEL } from '@/lib/feedback';

export const dynamic = 'force-dynamic';

export default function LearnPage() {
  const domains = getLearnOutline();
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">Learn</h1>
      <p className="mt-1 text-muted">
        Sources for each task statement, taken from the question lessons. Most-cited first.
      </p>

      {domains.map((d) => (
        <Card
          key={d.id}
          aria-labelledby={`learn-${d.id}`}
          data-testid="learn-domain"
          className="mt-6"
        >
          <h2 id={`learn-${d.id}`} className="text-xl font-semibold">
            Domain {d.id.slice(1)}: {d.name}{' '}
            <span className="text-sm font-normal text-muted">{Math.round(d.weight * 100)}%</span>
          </h2>
          {d.tasks.map((task) => (
            <section key={task.id} data-testid="learn-task" className="mt-4">
              <h3 className="font-semibold">
                {task.id} {task.title}
              </h3>
              {task.sources.length === 0 ? (
                <p className="mt-1 text-sm text-muted">No sources yet.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {task.sources.map((s) => (
                    <li key={s.url} className="flex flex-wrap items-center gap-2 text-sm">
                      <Chip tone="neutral">{SOURCE_LABEL[s.kind]}</Chip>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline"
                      >
                        <InlineText text={s.title} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </Card>
      ))}
    </div>
  );
}
