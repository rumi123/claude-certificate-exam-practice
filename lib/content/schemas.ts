import { z } from 'zod';

const TASK_REF = /^\d+\.\d+$/;

export const SyllabusSchema = z
  .object({
    version: z.number().int(),
    lessonBaseUrl: z.string(),
    domains: z.array(
      z
        .object({
          id: z.string().regex(/^D[1-5]$/),
          name: z.string(),
          weight: z.number(),
          slug: z.string(),
        })
        .strict(),
    ),
    tasks: z.array(
      z
        .object({
          id: z.string().regex(/^[1-5]\.[1-7]$/),
          domain: z.string(),
          title: z.string(),
          researchAnchor: z.string(),
          lessonUrl: z.string().nullable(),
          knowledge: z.array(z.string()),
          skills: z.array(z.string()),
        })
        .strict(),
    ),
    scenarios: z.array(
      z
        .object({
          id: z.string().regex(/^S[1-6]$/),
          name: z.string(),
          slug: z.string(),
          setup: z.string(),
          tools: z.array(z.string()),
        })
        .strict(),
    ),
    sources: z.record(z.string(), z.object({ title: z.string(), url: z.string() }).strict()),
  })
  .strict();

export const TrapsSchema = z
  .object({
    version: z.number().int(),
    traps: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          description: z.string(),
          principle: z.string(),
          examples: z.array(z.string()),
        })
        .strict(),
    ),
  })
  .strict();

export const OptionSchema = z
  .object({
    id: z.enum(['a', 'b', 'c', 'd', 'e']),
    text: z.string(),
    correct: z.boolean(),
    explanation: z.string(),
    trap: z.string().nullable(),
  })
  .strict();

export const QuestionSchema = z
  .object({
    id: z.string(),
    type: z.enum(['single', 'multi']),
    selectCount: z.union([z.literal(1), z.literal(2)]),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    primaryTask: z.string().regex(TASK_REF),
    secondaryTasks: z.array(z.string().regex(TASK_REF)).max(2),
    stem: z.string(),
    options: z.array(OptionSchema),
    keyConcept: z.string(),
    studyRef: z.string(),
    sources: z.array(z.string()).min(1),
    beyondGuide: z.boolean().optional(),
    authorNote: z.string().optional(),
  })
  .strict();

export const QuestionFileSchema = z
  .object({
    scenario: z.enum(['S1', 'S2', 'S3', 'S4', 'S5', 'S6']),
    version: z.number().int(),
    questions: z.array(QuestionSchema),
  })
  .strict();

const SCENARIO_ID = z.enum(['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);

export const MockQuestionSchema = QuestionSchema.extend({ scenario: SCENARIO_ID }).strict();

export const MockFileSchema = z
  .object({
    pool: z.string().regex(/^mock-\d+$/),
    version: z.number().int(),
    scenarios: z.array(SCENARIO_ID).length(4),
    questions: z.array(MockQuestionSchema),
  })
  .strict();

const OPTION_ID = z.enum(['a', 'b', 'c', 'd', 'e']);

export const LessonSourceSchema = z
  .object({
    kind: z.enum(['exam-guide', 'anthropic-docs', 'skilljar', 'community']),
    title: z.string().min(3),
    url: z.string().regex(/^https:\/\/\S+$/),
  })
  .strict();

export const LessonOptionSchema = z
  .object({
    reasoning: z.string().min(40),
    tempting: z.string().min(20).optional(),
  })
  .strict();

export const LessonSchema = z
  .object({
    questionId: z.string().regex(/^(M\d+-)?S[1-6]-(D[1-5]-)?\d{3}$/),
    explanation: z.string().min(80),
    // partialRecord: a 4-option question has no `e`; validate.ts checks the exact key set.
    options: z.partialRecord(OPTION_ID, LessonOptionSchema),
    concept: z.array(z.string().min(40)).min(1).max(4),
    conceptTable: z
      .object({
        headers: z.tuple([z.string(), z.string()]),
        rows: z.array(z.tuple([z.string(), z.string()])).min(2),
      })
      .strict()
      .optional(),
    stemSignals: z
      .array(z.object({ phrase: z.string().min(3), meaning: z.string().min(15) }).strict())
      .min(3)
      .max(6),
    lookFor: z.array(z.string().min(15)).min(2).max(5),
    eliminate: z
      .array(z.object({ option: OPTION_ID, reason: z.string().min(20) }).strict())
      .min(1),
    rule: z.string().min(20).max(300),
    sources: z.array(LessonSourceSchema).min(2),
    verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();

export const LessonFileSchema = z
  .object({
    domain: z.string().regex(/^D[1-5]$/),
    lessons: z.array(LessonSchema),
  })
  .strict();

export const FlashcardsSchema = z
  .object({
    version: z.number().int(),
    cards: z.array(
      z
        .object({
          id: z.string().regex(/^FC-[CA]-\d{3}$/),
          deck: z.enum(['concepts', 'anti-patterns']),
          task: z.string().regex(TASK_REF),
          front: z.string(),
          back: z.string(),
          trap: z.string().optional(),
        })
        .strict(),
    ),
  })
  .strict();

export const CheatsheetSchema = z
  .object({
    version: z.number().int(),
    decisions: z.array(
      z
        .object({
          situation: z.string(),
          choose: z.string(),
          why: z.string(),
          task: z.string().regex(TASK_REF),
        })
        .strict(),
    ),
    alwaysWrong: z.array(
      z.object({ text: z.string(), why: z.string(), trap: z.string() }).strict(),
    ),
    keyFacts: z.array(z.object({ group: z.string(), items: z.array(z.string()) }).strict()),
  })
  .strict();

export type Syllabus = z.infer<typeof SyllabusSchema>;
export type Traps = z.infer<typeof TrapsSchema>;
export type Option = z.infer<typeof OptionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionFile = z.infer<typeof QuestionFileSchema>;
export type MockQuestion = z.infer<typeof MockQuestionSchema>;
export type MockFile = z.infer<typeof MockFileSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type LessonFile = z.infer<typeof LessonFileSchema>;
export type Flashcards = z.infer<typeof FlashcardsSchema>;
export type Cheatsheet = z.infer<typeof CheatsheetSchema>;
