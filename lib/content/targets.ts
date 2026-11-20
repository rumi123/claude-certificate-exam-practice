// Coverage targets from the question authoring guide, section 8 and 6.3.

export const SCENARIO_IDS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] as const;

export const QUESTIONS_PER_FILE = 25;
export const MULTI_PER_FILE = 5;
export const DIFFICULTY_TARGET: Record<number, number> = { 1: 6, 2: 12, 3: 7 };
export const DIFFICULTY_TOLERANCE = 3;

export const DOMAIN_MIX: Record<string, Record<string, number>> = {
  S1: { D1: 11, D2: 7, D5: 7 },
  S2: { D1: 4, D3: 16, D5: 5 },
  S3: { D1: 12, D2: 6, D5: 7 },
  S4: { D1: 8, D2: 8, D3: 9 },
  S5: { D1: 4, D3: 7, D4: 14 },
  S6: { D1: 3, D2: 4, D4: 14, D5: 4 },
};

export const TASK_PLAN: Record<string, Record<string, number>> = {
  S1: { '1.1': 2, '1.4': 4, '1.5': 3, '1.7': 2, '2.1': 3, '2.2': 2, '2.3': 1, '2.4': 1, '5.1': 3, '5.2': 4 },
  S2: { '1.3': 1, '1.6': 2, '1.7': 1, '3.1': 4, '3.2': 3, '3.3': 3, '3.4': 3, '3.5': 3, '5.1': 2, '5.4': 3 },
  S3: { '1.1': 1, '1.2': 4, '1.3': 4, '1.6': 2, '1.7': 1, '2.1': 1, '2.2': 2, '2.3': 3, '5.1': 1, '5.3': 3, '5.6': 3 },
  S4: { '1.1': 1, '1.2': 1, '1.3': 2, '1.6': 2, '1.7': 2, '2.1': 1, '2.4': 3, '2.5': 4, '3.1': 2, '3.2': 2, '3.3': 1, '3.4': 2, '3.5': 2 },
  S5: { '1.1': 1, '1.4': 1, '1.5': 1, '1.7': 1, '3.2': 1, '3.6': 6, '4.1': 4, '4.2': 2, '4.3': 1, '4.5': 3, '4.6': 4 },
  S6: { '1.1': 1, '1.4': 1, '1.5': 1, '2.1': 1, '2.2': 1, '2.3': 1, '2.5': 1, '4.1': 1, '4.2': 2, '4.3': 4, '4.4': 4, '4.5': 2, '4.6': 1, '5.5': 3, '5.6': 1 },
};

export const MAX_TRAP_SHARE = 0.25;
export const MIN_DISTINCT_TRAPS = 10;
export const MAX_LONGEST_CORRECT_SHARE = 0.4;
export const ALWAYS_WRONG_COUNT = 10;
export const CONCEPT_CARDS_PER_TASK = 3;

// Mock papers (authoring guide section 10.4).
export const MOCK_QUESTIONS = 60;
export const MOCK_PER_SCENARIO = 15;
export const MOCK_MULTI = 12;
export const MOCK_DOMAIN_MIX: Record<string, number> = { D1: 16, D2: 11, D3: 12, D4: 12, D5: 9 };
export const MOCK_DOMAIN_TOLERANCE = 2;
export const MOCK_DIFFICULTY_TARGET: Record<number, number> = { 1: 10, 2: 30, 3: 20 };
export const MOCK_DIFFICULTY_TOLERANCE = 5;
export const MOCK_MAX_BEYOND_GUIDE = 4;
export const MOCK_MAX_NONEXISTENT = 4;
