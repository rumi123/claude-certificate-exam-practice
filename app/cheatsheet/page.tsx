import Link from 'next/link';
import PrintButton from '@/components/PrintButton';
import type { ReactNode } from 'react';
import { Chip } from '@/components/ui';
import DrillButton from '@/components/DrillButton';
import { loadContent } from '@/lib/content/load';
import { CheatsheetSchema } from '@/lib/content/schemas';
import { taskAnchor } from '@/lib/content/research';
import { getTrapDrillTasks, getTraps } from '@/lib/db/queries/catalog';

export const dynamic = 'force-dynamic';

const LINK = 'text-accent hover:underline';
const TH = 'px-2 py-1 text-left font-semibold';
const TD = 'px-2 py-1 align-top';

/** A collapsible card; open by default, and opened for printing by PrintButton. */
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <details
      open
      data-testid="cheatsheet-section"
      className="mt-6 rounded-xl border border-border bg-surface p-4"
    >
      <summary className="cursor-pointer">
        <h2 id={id} className="inline text-xl font-semibold">
          {title}
        </h2>
      </summary>
      {children}
    </details>
  );
}

function DrillLink({ task }: { task: string }) {
  return <DrillButton taskId={task} className={`${LINK} drill-link`} label="Drill" />;
}

export default function CheatsheetPage() {
  const sheet = CheatsheetSchema.parse(loadContent().cheatsheet.data);
  const traps = getTraps();
  const trapName = new Map(traps.map((t) => [t.id, t.name]));
  const drillTasks = getTrapDrillTasks();

  return (
    <div className="cheatsheet">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Decision sheet</h1>
        <PrintButton />
      </div>

      <Section id="decisions" title="Decisions">
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={TH}>Situation</th>
                <th className={TH}>Choose</th>
                <th className={TH}>Why</th>
                <th className={TH}>Task</th>
                <th className={`${TH} drill-link`}></th>
              </tr>
            </thead>
            <tbody>
              {sheet.decisions.map((d, i) => (
                <tr key={i} data-testid="decision-row" className="border-b border-border">
                  <td className={TD}>{d.situation}</td>
                  <td className={`${TD} font-medium`}>{d.choose}</td>
                  <td className={TD}>{d.why}</td>
                  <td className={TD}>
                    <Link href={`/research#${taskAnchor(d.task)}`} className={LINK}>
                      {d.task}
                    </Link>
                  </td>
                  <td className={`${TD} drill-link`}>
                    <DrillLink task={d.task} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="always-wrong" title="Always wrong">
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={TH}>Answer</th>
                <th className={TH}>Why</th>
                <th className={TH}>Trap</th>
              </tr>
            </thead>
            <tbody>
              {sheet.alwaysWrong.map((w, i) => (
                <tr key={i} data-testid="always-wrong-row" className="border-b border-border">
                  <td className={TD}>{w.text}</td>
                  <td className={TD}>{w.why}</td>
                  <td className={TD}>
                    <Link href={`#trap-${w.trap}`} title={trapName.get(w.trap) ?? w.trap}>
                      <Chip tone="weak">{trapName.get(w.trap) ?? w.trap}</Chip>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="catalog-traps" title="Trap catalog">
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={TH}>Trap</th>
                <th className={TH}>Description</th>
                <th className={TH}>Principle</th>
                <th className={`${TH} drill-link`}></th>
              </tr>
            </thead>
            <tbody>
              {traps.map((t) => (
                <tr key={t.id} id={`trap-${t.id}`} className="scroll-mt-4 border-b border-border">
                  <td className={`${TD} font-medium`}>{t.name}</td>
                  <td className={TD}>{t.description}</td>
                  <td className={TD}>{t.principle}</td>
                  <td className={`${TD} drill-link`}>
                    {drillTasks[t.id] ? <DrillLink task={drillTasks[t.id]} /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="key-facts" title="Key facts">
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2 xl:grid-cols-3">
          {sheet.keyFacts.map((g) => (
            <div key={g.group} data-testid="keyfact-group" className="mt-4 break-inside-avoid">
              <h3 className="font-semibold">{g.group}</h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                {g.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
