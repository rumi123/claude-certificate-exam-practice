// Builds the read-only lessons site into out/ (deployed to GitHub Pages by .github/workflows/pages.yml).
// Imports content-aicert/ into a throwaway database, then renders one page per question with its
// answers and lesson, plus an index. Run with `npm run build:lessons`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { compile, optimize } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';

const OUT = path.resolve(process.argv[2] ?? 'out');

// The database is opened on first use, so the path must be set before any query runs.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-site-'));
process.env.DATABASE_PATH = path.join(tmp, 'site.db');

async function main(): Promise<number> {
  const { importContent } = await import('../lib/content/import');
  const { loadContent } = await import('../lib/content/load');
  const { validateContent } = await import('../lib/content/validate');
  const { closeDb, getDb } = await import('../lib/db/client');
  const catalog = await import('../lib/db/queries/catalog');
  const sessions = await import('../lib/db/queries/sessions');
  const pages = await import('./lessons-site/pages');

  try {
    const raw = loadContent();
    const { errors } = validateContent(raw);
    if (errors.length) {
      for (const e of errors) console.log(`  ${e.file}${e.id ? ` ${e.id}` : ''}: ${e.message}`);
      console.log(`build:lessons FAILED (${errors.length} validation errors)`);
      return 1;
    }
    importContent(getDb(), raw);

    const scenarios = new Map(catalog.getScenarios().map((s) => [s.id, s]));
    const tasks = catalog.getTasks();
    const href = (id: string) => `q/${id}.html`;

    // Reading order: practice by domain and task, then each mock paper in question order.
    const groups: import('./lessons-site/pages').IndexGroup[] = [];
    const order: { id: string; source: string }[] = [];
    const practice = sessions.getCandidates({}, 'practice');
    const stemOf = (id: string) => catalog.getQuestionWithOptions(id)!.stem;

    for (const d of catalog.getDomains()) {
      const sections = tasks
        .filter((t) => t.domainId === d.id)
        .map((t) => {
          const ids = practice.filter((c) => c.primaryTaskId === t.id).map((c) => c.id);
          for (const id of ids) order.push({ id, source: 'Practice' });
          return {
            title: `${t.id} ${t.title}`,
            questions: ids.map((id) => pages.toLink(id, href(id), stemOf(id))),
          };
        })
        .filter((s) => s.questions.length > 0);
      groups.push({
        title: `Domain ${d.id.slice(1)}: ${d.name}`,
        subtitle: `${Math.round(d.weight * 100)}% of the exam`,
        sections,
      });
    }

    const mockSections = sessions.getMockPools().map((pool) => {
      const title = `Mock paper ${pool.replace(/^mock-/, '')}`;
      const ids = sessions.getCandidates({}, pool).map((c) => c.id);
      for (const id of ids) order.push({ id, source: title });
      return { title, questions: ids.map((id) => pages.toLink(id, href(id), stemOf(id))) };
    });
    if (mockSections.length) {
      groups.push({
        title: 'Mock papers',
        subtitle: 'Full exam papers. Reading these gives away the answers.',
        sections: mockSections,
      });
    }

    fs.rmSync(OUT, { recursive: true, force: true });
    fs.mkdirSync(path.join(OUT, 'q'), { recursive: true });
    const html: string[] = [];
    const write = (file: string, el: React.ReactElement) => {
      const markup = `<!doctype html>${renderToStaticMarkup(el)}`;
      html.push(markup);
      fs.writeFileSync(path.join(OUT, file), markup);
    };

    write(
      'index.html',
      <pages.Document title="CCAR-F lessons" css="style.css">
        <pages.IndexPage groups={groups} total={order.length} />
      </pages.Document>,
    );

    order.forEach(({ id, source }, i) => {
      const q = catalog.getQuestionWithOptions(id)!;
      const s = scenarios.get(q.scenarioId);
      const link = (j: number) =>
        j >= 0 && j < order.length
          ? pages.toLink(order[j].id, `${order[j].id}.html`, stemOf(order[j].id))
          : null;
      const data = {
        id,
        source,
        scenario: s ? { name: s.name, setup: s.setup } : null,
        stem: q.stem,
        selectCount: q.selectCount,
        feedback: sessions.getFeedback(
          id,
          [],
          q.options.map((o) => o.key),
        ),
        prev: link(i - 1),
        next: link(i + 1),
      };
      write(
        `q/${id}.html`,
        <pages.Document title={`${id} · CCAR-F lessons`} css="../style.css">
          <pages.QuestionPage data={data} indexHref="../index.html" />
        </pages.Document>,
      );
    });

    // Tailwind: compile the app's stylesheet with only the classes these pages use.
    const cssPath = path.resolve('app/globals.css');
    const compiler = await compile(fs.readFileSync(cssPath, 'utf8'), {
      base: path.dirname(cssPath),
      from: cssPath,
      onDependency: () => {},
    });
    const candidates = new Scanner({}).scanFiles(
      html.map((content) => ({ content, extension: 'html' })),
    );
    fs.writeFileSync(
      path.join(OUT, 'style.css'),
      optimize(compiler.build(candidates), { minify: true }).code,
    );

    console.log(`build:lessons wrote ${order.length} question pages to ${path.relative('.', OUT)}/`);
    return 0;
  } finally {
    closeDb();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (e: Error) => {
    console.error(e.stack ?? e.message);
    process.exitCode = 1;
  },
);
