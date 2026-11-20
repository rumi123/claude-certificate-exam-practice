import { importContent, type Counts } from '../lib/content/import';
import { loadContent } from '../lib/content/load';
import { validateContent } from '../lib/content/validate';
import { closeDb, getDb } from '../lib/db/client';

function fmt(c: Counts): string {
  return `${c.inserted} inserted, ${c.updated} updated, ${c.unchanged} unchanged, ${c.retired} retired`;
}

function main(): number {
  const raw = loadContent();
  const { errors } = validateContent(raw);
  if (errors.length) {
    for (const e of errors) console.log(`  ${e.file}${e.id ? ` ${e.id}` : ''}: ${e.message}`);
    console.log(`content:import FAILED (${errors.length} validation errors)`);
    return 1;
  }
  const r = importContent(getDb(), raw);
  console.log(`content:import ${fmt(r)} (questions); mocks ${fmt(r.mocks)}; cards ${fmt(r.cards)}; lessons ${fmt(r.lessons)}`);
  return 0;
}

try {
  process.exitCode = main();
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  closeDb();
}
