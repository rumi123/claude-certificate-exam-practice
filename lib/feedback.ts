import type { Lesson } from './content/schemas';

export type OptionStatus =
  'chosen-correct' | 'chosen-wrong' | 'missed' | 'not-chosen' | 'correct' | 'wrong';

export const OPTION_STATUS_LABEL: Record<OptionStatus, string> = {
  'chosen-correct': 'You chose · correct',
  'chosen-wrong': 'You chose · wrong',
  missed: 'Correct · you missed it',
  'not-chosen': 'Not chosen',
  correct: 'Correct',
  wrong: 'Wrong',
};

export function optionStatus(
  o: { isCorrect: boolean; selected: boolean },
  answered: boolean,
): OptionStatus {
  if (!answered) return o.isCorrect ? 'correct' : 'wrong';
  if (o.selected) return o.isCorrect ? 'chosen-correct' : 'chosen-wrong';
  return o.isCorrect ? 'missed' : 'not-chosen';
}

export type LessonView = Omit<Lesson, 'options' | 'eliminate' | 'questionId'> & {
  eliminate: { letter: string; key: string; reason: string }[];
};

export const SOURCE_LABEL: Record<LessonView['sources'][number]['kind'], string> = {
  'exam-guide': 'Exam guide',
  'anthropic-docs': 'Anthropic docs',
  skilljar: 'Claude Academy',
};

// Ruling-out rows use the letters of the current display order.
export function buildLessonView(
  lesson: Lesson,
  options: { key: string; letter: string }[],
): LessonView {
  const letters = new Map(options.map((o) => [o.key, o.letter]));
  return {
    explanation: lesson.explanation,
    concept: lesson.concept,
    conceptTable: lesson.conceptTable,
    stemSignals: lesson.stemSignals,
    lookFor: lesson.lookFor,
    rule: lesson.rule,
    sources: lesson.sources,
    verifiedAt: lesson.verifiedAt,
    eliminate: lesson.eliminate
      .map((e) => ({ letter: letters.get(e.option) ?? '', key: e.option, reason: e.reason }))
      .sort((a, b) => a.letter.localeCompare(b.letter)),
  };
}

export type FeedbackData = {
  questionId: string;
  result: { isCorrect: boolean; correctSelected: number; selectCount: number } | null;
  options: {
    letter: string;
    key: string;
    text: string;
    isCorrect: boolean;
    selected: boolean;
    explanation: string;
    reasoning: string | null;
    tempting: string | null;
    trap: { id: string; name: string; description: string } | null;
  }[];
  keyConcept: string;
  lesson: LessonView | null;
  tags: {
    scenario: string;
    domain: string;
    primaryTask: { id: string; title: string };
    secondaryTasks: { id: string; title: string }[];
    difficulty: number;
  };
  links: { research: string; lesson: string | null };
};

export function bannerText(result: NonNullable<FeedbackData['result']>): string {
  if (result.isCorrect) return 'Correct';
  if (result.selectCount > 1 && result.correctSelected > 0) {
    return `Partially correct — ${result.correctSelected} of ${result.selectCount} correct, counts as wrong`;
  }
  return 'Incorrect';
}
