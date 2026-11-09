import type { Confidence } from '@/lib/types';

export type AnsweredItem = {
  sessionId: string;
  questionId: string;
  scenarioId: string;
  domainId: string;
  primaryTaskId: string;
  secondaryTaskIds: string[];
  selectCount: number;
  isCorrect: boolean;
  correctSelected: number;
  confidence: Confidence | null;
  timeMs: number | null;
  answeredAt: number;
  selectedKeys: string[];
  optionTraps: { key: string; trapId: string | null }[];
};

export type Status = 'strong' | 'ok' | 'weak' | 'untested';

export type TaskMastery = { mastery: number | null; n: number; status: Status };
