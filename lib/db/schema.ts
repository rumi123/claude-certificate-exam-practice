import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const domain = sqliteTable('domain', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  weight: real('weight').notNull(),
});

export const taskStatement = sqliteTable('task_statement', {
  id: text('id').primaryKey(),
  domainId: text('domain_id')
    .notNull()
    .references(() => domain.id),
  title: text('title').notNull(),
  researchAnchor: text('research_anchor'),
  lessonUrl: text('lesson_url'),
  knowledgeJson: text('knowledge_json'),
  skillsJson: text('skills_json'),
});

export const scenario = sqliteTable('scenario', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  setup: text('setup').notNull(),
  toolsJson: text('tools_json'),
});

export const trap = sqliteTable('trap', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  principle: text('principle').notNull(),
  examplesJson: text('examples_json'),
});

export const question = sqliteTable(
  'question',
  {
    id: text('id').primaryKey(),
    scenarioId: text('scenario_id')
      .notNull()
      .references(() => scenario.id),
    domainId: text('domain_id')
      .notNull()
      .references(() => domain.id),
    primaryTaskId: text('primary_task_id')
      .notNull()
      .references(() => taskStatement.id),
    pool: text('pool').notNull().default('practice'),
    type: text('type').notNull(),
    selectCount: integer('select_count').notNull(),
    difficulty: integer('difficulty').notNull(),
    stem: text('stem').notNull(),
    keyConcept: text('key_concept').notNull(),
    studyRef: text('study_ref'),
    version: integer('version').notNull(),
    contentHash: text('content_hash').notNull(),
    retired: integer('retired').notNull().default(0),
  },
  (t) => [
    index('question_scenario_idx').on(t.scenarioId),
    index('question_domain_idx').on(t.domainId),
  ],
);

export const questionOption = sqliteTable(
  'question_option',
  {
    questionId: text('question_id')
      .notNull()
      .references(() => question.id),
    key: text('key').notNull(),
    position: integer('position').notNull(),
    text: text('text').notNull(),
    isCorrect: integer('is_correct').notNull(),
    explanation: text('explanation').notNull(),
    trapId: text('trap_id').references(() => trap.id),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.key] })],
);

export const questionTask = sqliteTable(
  'question_task',
  {
    questionId: text('question_id')
      .notNull()
      .references(() => question.id),
    taskId: text('task_id')
      .notNull()
      .references(() => taskStatement.id),
    isPrimary: integer('is_primary').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.taskId] })],
);

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  mode: text('mode').notNull(),
  filtersJson: text('filters_json').notNull(),
  status: text('status').notNull().default('in_progress'),
  timeLimitS: integer('time_limit_s'),
  startedAt: integer('started_at').notNull(),
  finishedAt: integer('finished_at'),
  mockId: text('mock_id'),
});

export const sessionItem = sqliteTable(
  'session_item',
  {
    sessionId: text('session_id')
      .notNull()
      .references(() => session.id),
    position: integer('position').notNull(),
    questionId: text('question_id')
      .notNull()
      .references(() => question.id),
    optionOrderJson: text('option_order_json').notNull(),
    selectedJson: text('selected_json'),
    isCorrect: integer('is_correct'),
    correctSelected: integer('correct_selected'),
    confidence: text('confidence'),
    timeMs: integer('time_ms'),
    answeredAt: integer('answered_at'),
    marked: integer('marked').notNull().default(0),
    reviewEffect: text('review_effect'),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.position] }),
    index('session_item_question_idx').on(t.questionId),
    index('session_item_answered_idx').on(t.answeredAt),
  ],
);

export const reviewItem = sqliteTable(
  'review_item',
  {
    questionId: text('question_id')
      .primaryKey()
      .references(() => question.id),
    box: integer('box').notNull(),
    dueAt: integer('due_at').notNull(),
    lapses: integer('lapses').notNull().default(0),
    retiredAt: integer('retired_at'),
    lastSeenAt: integer('last_seen_at'),
  },
  (t) => [index('review_item_due_idx').on(t.dueAt)],
);

export const questionFlag = sqliteTable('question_flag', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  questionId: text('question_id')
    .notNull()
    .references(() => question.id),
  note: text('note'),
  createdAt: integer('created_at').notNull(),
  resolved: integer('resolved').notNull().default(0),
});

// Catalog table (not progress): backup and reset leave it alone.
export const questionLesson = sqliteTable('question_lesson', {
  questionId: text('question_id')
    .primaryKey()
    .references(() => question.id),
  lessonJson: text('lesson_json').notNull(),
  contentHash: text('content_hash').notNull(),
});

export const flashcard = sqliteTable('flashcard', {
  id: text('id').primaryKey(),
  deck: text('deck').notNull(),
  taskId: text('task_id').references(() => taskStatement.id),
  domainId: text('domain_id').references(() => domain.id),
  trapId: text('trap_id').references(() => trap.id),
  front: text('front').notNull(),
  back: text('back').notNull(),
  retired: integer('retired').notNull().default(0),
});

export const flashcardState = sqliteTable('flashcard_state', {
  cardId: text('card_id')
    .primaryKey()
    .references(() => flashcard.id),
  box: integer('box').notNull(),
  dueAt: integer('due_at').notNull(),
  firstSeenAt: integer('first_seen_at'),
  lastRatedAt: integer('last_rated_at'),
});

export const setting = sqliteTable('setting', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// Catalog table (not progress): backup and reset leave it alone.
export const contentMeta = sqliteTable('content_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
