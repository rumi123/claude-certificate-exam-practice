import fs from 'node:fs';

export function loadResearch(): string {
  const file = process.env.RESEARCH_PATH ?? 'docs/ccaf-exam-research.md';
  try {
    return fs.readFileSync(/*turbopackIgnore: true*/ file, 'utf8');
  } catch (e) {
    throw new Error(`Cannot read ${file}: ${(e as Error).message}`);
  }
}

export function taskAnchor(taskId: string): string {
  return `task-${taskId.replace('.', '-')}`;
}

export interface ResearchHeading {
  id: string;
  text: string;
}

// `##` headings of the markdown, with the ids rehype-slug will give them.
export function researchHeadings(markdown: string): ResearchHeading[] {
  const seen = new Map<string, number>();
  const out: ResearchHeading[] = [];
  let inFence = false;
  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) inFence = !inFence;
    const m = !inFence && /^## (.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = m[1].replace(/[`*_]/g, '');
    const base = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\- _]/gu, '')
      .replace(/ /g, '-');
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.push({ id: n === 0 ? base : `${base}-${n}`, text });
  }
  return out;
}
