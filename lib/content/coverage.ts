import type { Flashcards, QuestionFile, Syllabus } from './schemas';

export interface Coverage {
  questions: number;
  multi: number;
  scenarioDomain: Record<string, Record<string, number>>;
  domainTotals: Record<string, number>;
  tasks: Record<string, number>;
  types: Record<string, number>;
  difficulty: Record<string, number>;
  flashcards: Record<string, number>;
}

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

export function buildCoverage(
  syllabus: Syllabus | null,
  questionFiles: QuestionFile[],
  flashcards: Flashcards | null,
): Coverage {
  const domainOf = new Map((syllabus?.tasks ?? []).map((t) => [t.id, t.domain]));
  const cov: Coverage = {
    questions: 0,
    multi: 0,
    scenarioDomain: {},
    domainTotals: {},
    tasks: {},
    types: {},
    difficulty: {},
    flashcards: {},
  };
  for (const file of questionFiles) {
    const row = (cov.scenarioDomain[file.scenario] ??= {});
    for (const q of file.questions) {
      cov.questions++;
      if (q.type === 'multi') cov.multi++;
      const domain = domainOf.get(q.primaryTask) ?? 'unknown';
      bump(row, domain);
      bump(cov.domainTotals, domain);
      bump(cov.tasks, q.primaryTask);
      bump(cov.types, q.type);
      bump(cov.difficulty, String(q.difficulty));
    }
  }
  for (const card of flashcards?.cards ?? []) bump(cov.flashcards, card.deck);
  return cov;
}
