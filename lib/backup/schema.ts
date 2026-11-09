import { z } from 'zod';

const int = z.number().int();

const SessionRow = z.object({
  id: z.string(),
  kind: z.string(),
  mode: z.string(),
  filtersJson: z.string(),
  status: z.string(),
  timeLimitS: int.nullable(),
  startedAt: int,
  finishedAt: int.nullable(),
  mockId: z.string().nullable(),
});

const SessionItemRow = z.object({
  sessionId: z.string(),
  position: int,
  questionId: z.string(),
  optionOrderJson: z.string(),
  selectedJson: z.string().nullable(),
  isCorrect: int.nullable(),
  correctSelected: int.nullable(),
  confidence: z.string().nullable(),
  timeMs: int.nullable(),
  answeredAt: int.nullable(),
  marked: int,
  reviewEffect: z.string().nullable(),
});

const ReviewItemRow = z.object({
  questionId: z.string(),
  box: int,
  dueAt: int,
  lapses: int,
  retiredAt: int.nullable(),
  lastSeenAt: int.nullable(),
});

const QuestionFlagRow = z.object({
  id: int,
  questionId: z.string(),
  note: z.string().nullable(),
  createdAt: int,
  resolved: int,
});

const FlashcardStateRow = z.object({
  cardId: z.string(),
  box: int,
  dueAt: int,
  firstSeenAt: int.nullable(),
  lastRatedAt: int.nullable(),
});

const SettingRow = z.object({ key: z.string(), value: z.string() });

// Row keys are the Drizzle property names of the matching tables in lib/db/schema.ts.
export const BackupSchema = z.object({
  format: z.literal('ccaf-backup'),
  schemaVersion: z.literal(1),
  exportedAt: int,
  tables: z.object({
    session: z.array(SessionRow),
    session_item: z.array(SessionItemRow),
    review_item: z.array(ReviewItemRow),
    question_flag: z.array(QuestionFlagRow),
    flashcard_state: z.array(FlashcardStateRow),
    setting: z.array(SettingRow),
  }),
});

export type Backup = z.infer<typeof BackupSchema>;
export type BackupTable = keyof Backup['tables'];
export const BACKUP_TABLES: BackupTable[] = [
  'session',
  'session_item',
  'review_item',
  'question_flag',
  'flashcard_state',
  'setting',
];
