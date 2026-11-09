import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { importContent } from '@/lib/content/import';
import { loadContent } from '@/lib/content/load';
import { closeDb, getDb } from '@/lib/db/client';
import { getAnsweredItems, getCompletedSessions } from '@/lib/db/queries/history';
import {
  getDomains,
  getQuestionCountsByTask,
  getScenarios,
  getTasks,
  getTraps,
} from '@/lib/db/queries/catalog';
import { createSession, recordAnswer } from '@/lib/db/queries/sessions';
import { buildReport, type ReportInput } from '@/lib/report/build-report';
import { history } from '../fixtures/history';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccaf-report-'));
  process.env.DATABASE_PATH = path.join(dir, 'test.db');
  importContent(getDb(), loadContent('tests/fixtures/content'));
});

afterEach(() => {
  closeDb();
  delete process.env.DATABASE_PATH;
  fs.rmSync(dir, { recursive: true, force: true });
});

function input(items: ReportInput['items'] = [], sessions: ReportInput['sessions'] = []) {
  return {
    items,
    sessions,
    tasks: getTasks().map((t) => ({ id: t.id, title: t.title, domainId: t.domainId })),
    domains: getDomains(),
    scenarios: getScenarios(),
    traps: getTraps(),
    bankCountsByTask: getQuestionCountsByTask(),
    dueCount: 0,
    now: 0,
  } satisfies ReportInput;
}

describe('buildReport', () => {
  it('handles an empty history', () => {
    const r = buildReport(input());
    expect(r.summary).toMatchObject({ score: 100, label: 'Low data', totalAnswers: 0, trend: [] });
    expect(r.tasks).toHaveLength(getTasks().length);
    expect(r.priorities).toHaveLength(8);
    expect(r.priorities.every((p) => p.status === 'untested')).toBe(true);
    expect(r.priorities[0].domainId).toBe('D1');
    expect(r.traps).toEqual([]);
    expect(r.scenarios).toHaveLength(getScenarios().length);
    expect(r.domains.every((d) => d.status === 'untested')).toBe(true);
  });

  it('computes accuracy, trend and task rows from a history', () => {
    const items = history('1.4', [1, 1, 0, 0]);
    const r = buildReport(
      input(items, [
        { id: 'a', finishedAt: 1, correct: 1, answered: 2 },
        { id: 'b', finishedAt: 2, correct: 2, answered: 2 },
      ]),
    );
    expect(r.summary.accuracy).toBe(0.5);
    expect(r.summary.trend).toEqual([0.5, 1]);
    const row = r.tasks.find((t) => t.id === '1.4')!;
    expect(row.n).toBe(4);
    expect(row.lastSeenAt).toBe(1000);
  });

  it('keeps a tested task in studyAgain when untested tasks fill the priority list', () => {
    const r = buildReport(input(history('1.4', [1, 1, 0])));
    expect(r.priorities.some((p) => p.taskId === '1.4')).toBe(false);
    expect(r.studyAgain.map((p) => p.taskId)).toEqual(['1.4']);
  });
});

describe('getAnsweredItems', () => {
  it('maps every field of one answered item', () => {
    const id = createSession({
      kind: 'practice',
      mode: 'study',
      filters: {},
      timeLimitS: null,
      items: [{ questionId: 'S1-001', position: 0, optionOrder: ['a', 'b', 'c', 'd'] }],
    });
    recordAnswer({ sessionId: id, position: 0, selected: ['b'], confidence: 'sure', timeMs: 4321 });
    const [it] = getAnsweredItems();
    expect(it).toMatchObject({
      sessionId: id,
      questionId: 'S1-001',
      primaryTaskId: '1.4',
      secondaryTaskIds: ['1.5'],
      selectCount: 1,
      isCorrect: false,
      correctSelected: 0,
      confidence: 'sure',
      timeMs: 4321,
      selectedKeys: ['b'],
    });
    expect(it.answeredAt).toBeGreaterThan(0);
    expect(it.scenarioId).toBeTruthy();
    expect(it.domainId).toBe('D1');
    expect(it.optionTraps).toHaveLength(4);
    expect(it.optionTraps[1].trapId).toBe('PROMPT_FOR_GUARANTEE');
    const done = getCompletedSessions();
    expect(done).toEqual([expect.objectContaining({ id, correct: 0, answered: 1 })]);
  });
});
