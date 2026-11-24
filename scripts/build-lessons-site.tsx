// Builds the public study site into out/ (deployed to GitHub Pages by .github/workflows/pages.yml).
// Only the Learn page and the decision sheet are published: no questions, answers or lessons.
// Imports content-aicert/ into a throwaway database to reuse the app's queries.
// Run with `npm run build:lessons`.
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
  const { CheatsheetSchema } = await import('../lib/content/schemas');
  const { closeDb, getDb } = await import('../lib/db/client');
  const { getTraps } = await import('../lib/db/queries/catalog');
  const { default: LearnPage } = await import('../app/learn/page');
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

    fs.rmSync(OUT, { recursive: true, force: true });
    fs.mkdirSync(OUT, { recursive: true });
    const html: string[] = [];
    const write = (file: string, el: React.ReactElement) => {
      const markup = `<!doctype html>${renderToStaticMarkup(el)}`;
      html.push(markup);
      fs.writeFileSync(path.join(OUT, file), markup);
    };

    write(
      'index.html',
      <pages.Document title="Learn · CCAR-F" current="index.html">
        <LearnPage />
      </pages.Document>,
    );
    write(
      'decision-sheet.html',
      <pages.Document title="Decision sheet · CCAR-F" current="decision-sheet.html">
        <pages.DecisionSheet
          sheet={CheatsheetSchema.parse(raw.cheatsheet.data)}
          traps={getTraps()}
        />
      </pages.Document>,
    );

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

    console.log(`build:lessons wrote ${html.length} pages to ${path.relative('.', OUT)}/`);
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
