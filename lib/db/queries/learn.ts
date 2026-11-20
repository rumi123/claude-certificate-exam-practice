import { asc, eq } from 'drizzle-orm';
import type { Lesson } from '../../content/schemas';
import { getDb } from '../client';
import * as t from '../schema';

type SourceKind = Lesson['sources'][number]['kind'];

export type LearnSource = { kind: SourceKind; title: string; url: string; lessons: number };
export type LearnTask = { id: string; title: string; sources: LearnSource[] };
export type LearnDomain = { id: string; name: string; weight: number; tasks: LearnTask[] };

// The exam-guide source is a third-party reproduction of the guide, not an Anthropic page.
const HIDDEN_KINDS: ReadonlySet<SourceKind> = new Set(['exam-guide']);

// Dedupes one task's lesson sources by URL. Most-cited first; the shortest title wins because
// longer variants carry lesson-specific notes like "(plan mode)".
export function groupTaskSources(lessons: Pick<Lesson, 'sources'>[]): LearnSource[] {
  const byUrl = new Map<string, LearnSource>();
  for (const lesson of lessons) {
    const seen = new Set<string>();
    for (const s of lesson.sources) {
      if (HIDDEN_KINDS.has(s.kind) || seen.has(s.url)) continue;
      seen.add(s.url);
      const prev = byUrl.get(s.url);
      if (!prev) {
        byUrl.set(s.url, { kind: s.kind, title: s.title, url: s.url, lessons: 1 });
      } else {
        prev.lessons += 1;
        if (s.title.length < prev.title.length) prev.title = s.title;
      }
    }
  }
  return [...byUrl.values()].sort(
    (a, b) => b.lessons - a.lessons || a.title.localeCompare(b.title),
  );
}

export function getLearnOutline(): LearnDomain[] {
  const db = getDb();
  const domains = db.select().from(t.domain).orderBy(asc(t.domain.id)).all();
  const tasks = db.select().from(t.taskStatement).orderBy(asc(t.taskStatement.id)).all();
  const rows = db
    .select({ taskId: t.question.primaryTaskId, json: t.questionLesson.lessonJson })
    .from(t.questionLesson)
    .innerJoin(t.question, eq(t.question.id, t.questionLesson.questionId))
    .where(eq(t.question.retired, 0))
    .all();

  const lessonsByTask = new Map<string, Pick<Lesson, 'sources'>[]>();
  for (const r of rows) {
    const list = lessonsByTask.get(r.taskId) ?? [];
    list.push(JSON.parse(r.json) as Lesson);
    lessonsByTask.set(r.taskId, list);
  }

  return domains.map((d) => ({
    id: d.id,
    name: d.name,
    weight: d.weight,
    tasks: tasks
      .filter((task) => task.domainId === d.id)
      .map((task) => ({
        id: task.id,
        title: task.title,
        sources: groupTaskSources(lessonsByTask.get(task.id) ?? []),
      })),
  }));
}
