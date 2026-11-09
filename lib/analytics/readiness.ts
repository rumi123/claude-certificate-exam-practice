export type ConfidenceLabel = 'Low data' | 'Medium' | 'Good';

export function weightedRaw(
  domainMasteries: Record<string, number | null>,
  weights: Record<string, number>,
): number {
  let raw = 0;
  for (const [id, w] of Object.entries(weights)) raw += w * (domainMasteries[id] ?? 0);
  return raw;
}

export function scaledScore(raw: number, cut = Number(process.env.SCALED_CUT_RAW ?? 0.72)): number {
  const scaled = raw <= cut ? 100 + (620 * raw) / cut : 720 + (280 * (raw - cut)) / (1 - cut);
  return Math.round(scaled / 10) * 10;
}

export function confidenceLabel(
  totalAnswers: number,
  answersPerDomain: Record<string, number>,
): ConfidenceLabel {
  if (totalAnswers < 60) return 'Low data';
  const counts = Object.values(answersPerDomain);
  if (totalAnswers >= 150 && counts.length > 0 && counts.every((n) => n >= 15)) return 'Good';
  return 'Medium';
}
