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
    trap: { id: string; name: string; description: string } | null;
  }[];
  keyConcept: string;
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
