import Link from 'next/link';
import PrintButton from '@/components/PrintButton';
import { Card, Chip } from '@/components/ui';
import DrillButton from '@/components/DrillButton';
import { loadContent } from '@/lib/content/load';
import { CheatsheetSchema } from '@/lib/content/schemas';
import { taskAnchor } from '@/lib/content/research';
import { getTrapDrillTasks, getTraps } from '@/lib/db/queries/catalog';

export const dynamic = 'force-dynamic';

const LINK = 'text-accent hover:underline';
const TH = 'px-2 py-1 text-left font-semibold';
const TD = 'px-2 py-1 align-top';

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

      <Card aria-labelledby="decisions" className="mt-6">
        <h2 id="decisions" className="text-xl font-semibold">
          Decisions
        </h2>
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
      </Card>

      <Card aria-labelledby="always-wrong" className="mt-6">
        <h2 id="always-wrong" className="text-xl font-semibold">
          Always wrong
        </h2>
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
      </Card>

      <Card aria-labelledby="catalog-traps" className="mt-6">
        <h2 id="catalog-traps" className="text-xl font-semibold">
          Trap catalog
        </h2>
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
      </Card>

      <Card aria-labelledby="key-facts" className="mt-6">
        <h2 id="key-facts" className="text-xl font-semibold">
          Key facts
        </h2>
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
      </Card>
    </div>
  );
}
