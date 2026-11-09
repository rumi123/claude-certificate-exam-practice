import { loadContent } from '../lib/content/load';
import { validateContent, type Issue } from '../lib/content/validate';
import type { Coverage } from '../lib/content/coverage';

function fmtIssue(i: Issue): string {
  return `  ${i.file}${i.id ? ` ${i.id}` : ''}: ${i.message}`;
}

function table(title: string, head: string[], rows: (string | number)[][]): string {
  const all = [head, ...rows].map((r) => r.map(String));
  const widths = head.map((_, c) => Math.max(...all.map((r) => r[c].length)));
  const line = (r: string[]) =>
    r.map((cell, c) => (c === 0 ? cell.padEnd(widths[c]) : cell.padStart(widths[c]))).join('  ');
  return [title, ...all.map(line)].join('\n');
}

function printCoverage(cov: Coverage): void {
  const domains = Object.keys(cov.domainTotals).sort();
  const scenarios = Object.keys(cov.scenarioDomain).sort();
  const rows = scenarios.map((s) => [
    s,
    ...domains.map((d) => cov.scenarioDomain[s][d] ?? 0),
    Object.values(cov.scenarioDomain[s]).reduce((a, b) => a + b, 0),
  ]);
  rows.push(['Total', ...domains.map((d) => cov.domainTotals[d]), cov.questions]);
  console.log(table('\nScenario x domain', ['', ...domains, 'All'], rows));
  const tasks = Object.keys(cov.tasks).sort(
    (a, b) => Number(a.replace('.', '')) - Number(b.replace('.', '')),
  );
  console.log(
    table(
      '\nQuestions per primary task',
      ['Task', 'Count'],
      tasks.map((t) => [t, cov.tasks[t]]),
    ),
  );
  console.log(table('\nBy type', ['Type', 'Count'], Object.entries(cov.types)));
  console.log(table('\nBy difficulty', ['Level', 'Count'], Object.entries(cov.difficulty).sort()));
  console.log(table('\nFlashcards per deck', ['Deck', 'Count'], Object.entries(cov.flashcards)));
}

function main(): number {
  const { errors, warnings, coverage } = validateContent(loadContent());
  if (errors.length) console.log(`Errors (${errors.length}):\n${errors.map(fmtIssue).join('\n')}`);
  if (warnings.length)
    console.log(`\nWarnings (${warnings.length}):\n${warnings.map(fmtIssue).join('\n')}`);
  printCoverage(coverage);
  console.log('');
  if (errors.length) {
    console.log(`content:validate FAILED (${errors.length} errors)`);
    return 1;
  }
  console.log(
    `content:validate OK (${coverage.questions} questions, 0 errors, ${warnings.length} warnings)`,
  );
  return 0;
}

try {
  process.exitCode = main();
} catch (e) {
  console.error((e as Error).message);
  console.log('content:validate FAILED (1 errors)');
  process.exitCode = 1;
}
