import { Chip, InlineText } from '@/components/ui';
import { SOURCE_LABEL, type LessonView } from '@/lib/feedback';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-11-19" -> "19 Nov 2026", by splitting the string (no clock, no Date).
function checkedOn(verifiedAt: string): string {
  const [y, m, d] = verifiedAt.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

function H3({ children }: { children: string }) {
  return <h3 className="mt-4 text-base font-semibold">{children}</h3>;
}

function Table({ headers, rows }: { headers: [string, string]; rows: [string, string][] }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-left text-base">
        <thead>
          <tr className="border-b border-border text-muted">
            <th scope="col" className="py-1 pr-3 font-medium">
              {headers[0]}
            </th>
            <th scope="col" className="py-1 font-medium">
              {headers[1]}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b], i) => (
            <tr key={i} className="border-b border-border align-top last:border-0">
              <td className="py-1 pr-3">
                <InlineText text={a} />
              </td>
              <td className="py-1">
                <InlineText text={b} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TeachingSection({ lesson }: { lesson: LessonView }) {
  return (
    <details open data-testid="teaching" className="rounded-xl border border-border bg-surface p-4">
      <summary className="cursor-pointer text-lg font-semibold">Teaching</summary>

      <H3>The question explained</H3>
      <p className="mt-1">
        <InlineText text={lesson.explanation} />
      </p>

      <H3>The concept</H3>
      {lesson.concept.map((p, i) => (
        <p key={i} className="mt-1">
          <InlineText text={p} />
        </p>
      ))}
      {lesson.conceptTable && (
        <Table headers={lesson.conceptTable.headers} rows={lesson.conceptTable.rows} />
      )}

      <H3>How to read the stem</H3>
      <Table
        headers={['What the stem says', 'What it tells you']}
        rows={lesson.stemSignals.map((s) => [s.phrase, s.meaning])}
      />

      <H3>What to look for in the answers</H3>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {lesson.lookFor.map((t, i) => (
          <li key={i}>
            <InlineText text={t} />
          </li>
        ))}
      </ul>

      <H3>Ruling out each wrong answer</H3>
      <ul className="mt-1 space-y-1">
        {lesson.eliminate.map((e) => (
          <li key={e.key} className="flex gap-2">
            <span className="font-mono font-semibold">{e.letter}</span>
            <span>
              <InlineText text={e.reason} />
            </span>
          </li>
        ))}
      </ul>

      <H3>Rule to remember</H3>
      <p data-testid="teaching-rule" className="mt-1 rounded-xl bg-accent-soft p-3 font-medium">
        <InlineText text={lesson.rule} />
      </p>

      <H3>Sources</H3>
      <ul className="mt-1 space-y-1">
        {lesson.sources.map((s) => (
          <li key={s.url} className="flex flex-wrap items-center gap-2">
            <Chip tone="neutral">{SOURCE_LABEL[s.kind]}</Chip>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              {s.title}
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-muted">Checked on {checkedOn(lesson.verifiedAt)}</p>
    </details>
  );
}
