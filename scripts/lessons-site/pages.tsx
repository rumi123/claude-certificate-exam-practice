// Static pages for the public study site (scripts/build-lessons-site.tsx): Learn and the
// decision sheet only. No questions or answers are published.
// No next/* imports: these are rendered with react-dom/server outside Next.
// Links are relative so the site works under any path (GitHub Pages serves it from /<repo>/).
import type { ReactNode } from 'react';
import { Chip } from '@/components/ui';
import type { Cheatsheet } from '@/lib/content/schemas';

export const PAGES = [
  { file: 'index.html', label: 'Learn' },
  { file: 'decision-sheet.html', label: 'Decision sheet' },
] as const;

export function Document({
  title,
  current,
  children,
}: {
  title: string;
  current: (typeof PAGES)[number]['file'];
  children: ReactNode;
}) {
  return (
    <html lang="en" data-theme="system">
      {/* Rendered with react-dom/server outside Next, so next/head does not apply. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>{title}</title>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="style.css" />
      </head>
      <body className="min-h-screen bg-bg text-fg">
        <nav className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-[96rem] gap-1 px-4 py-2 lg:px-6">
            {PAGES.map((p) => (
              <a
                key={p.file}
                href={p.file}
                aria-current={p.file === current ? 'page' : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  p.file === current ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2'
                }`}
              >
                {p.label}
              </a>
            ))}
          </div>
        </nav>
        <main className="mx-auto max-w-[96rem] px-4 py-6 lg:px-6">{children}</main>
      </body>
    </html>
  );
}

const TH = 'px-2 py-1 text-left font-semibold';
const TD = 'px-2 py-1 align-top';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <details open className="mt-6 rounded-xl border border-border bg-surface p-4">
      <summary className="cursor-pointer">
        <h2 id={id} className="inline text-xl font-semibold">
          {title}
        </h2>
      </summary>
      {children}
    </details>
  );
}

// Static copy of app/cheatsheet/page.tsx without the app-only Drill and research links.
export function DecisionSheet({
  sheet,
  traps,
}: {
  sheet: Cheatsheet;
  traps: { id: string; name: string; description: string; principle: string }[];
}) {
  const trapName = new Map(traps.map((t) => [t.id, t.name]));
  return (
    <div className="cheatsheet">
      <h1 className="text-2xl font-bold">Decision sheet</h1>

      <Section id="decisions" title="Decisions">
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={TH}>Situation</th>
                <th className={TH}>Choose</th>
                <th className={TH}>Why</th>
                <th className={TH}>Task</th>
              </tr>
            </thead>
            <tbody>
              {sheet.decisions.map((d, i) => (
                <tr key={i} className="border-b border-border">
                  <td className={TD}>{d.situation}</td>
                  <td className={`${TD} font-medium`}>{d.choose}</td>
                  <td className={TD}>{d.why}</td>
                  <td className={TD}>{d.task}</td>
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
                <tr key={i} className="border-b border-border">
                  <td className={TD}>{w.text}</td>
                  <td className={TD}>{w.why}</td>
                  <td className={TD}>
                    <a href={`#trap-${w.trap}`} title={trapName.get(w.trap) ?? w.trap}>
                      <Chip tone="weak">{trapName.get(w.trap) ?? w.trap}</Chip>
                    </a>
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
              </tr>
            </thead>
            <tbody>
              {traps.map((t) => (
                <tr key={t.id} id={`trap-${t.id}`} className="scroll-mt-4 border-b border-border">
                  <td className={`${TD} font-medium`}>{t.name}</td>
                  <td className={TD}>{t.description}</td>
                  <td className={TD}>{t.principle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="key-facts" title="Key facts">
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2 xl:grid-cols-3">
          {sheet.keyFacts.map((g) => (
            <div key={g.group} className="mt-4 break-inside-avoid">
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
