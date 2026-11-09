export function score(
  correctKeys: string[],
  selected: string[],
): { isCorrect: boolean; correctSelected: number } {
  const correct = new Set(correctKeys);
  const picked = new Set(selected);
  let correctSelected = 0;
  for (const k of picked) if (correct.has(k)) correctSelected++;
  const isCorrect = picked.size === correct.size && correctSelected === correct.size;
  return { isCorrect, correctSelected };
}
