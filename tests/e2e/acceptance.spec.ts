import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { DAY_MS, latestSessionId, setClockOffset, sql } from './helpers/db';
import { clearProgress, seedSession } from './helpers/seed';

// One test per phase-1 acceptance criterion of the specification, section 18.

const MIN_MS = 60_000;
const AC1_DB = 'test-results/ac1.db';
const PROGRESS_TABLES = [
  'session',
  'session_item',
  'review_item',
  'question_flag',
  'flashcard_state',
];

function wipe(): void {
  sql(
    `delete from session_item; delete from session; delete from review_item;
     delete from question_flag; delete from flashcard_state; delete from setting where key like 'pref.%';`,
  );
  setClockOffset(0);
}

async function start(page: Page, query: string): Promise<void> {
  await page.goto(`/practice?${query}`);
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
}

async function pickAndSubmit(page: Page, correct: boolean): Promise<void> {
  const text = sql(
    `select o.text from question_option o join session_item i on i.question_id = o.question_id
     where i.session_id = ${latestSessionId} and o.is_correct = ${correct ? 1 : 0} limit 1`,
  );
  // InlineText renders backticks as <code>, so the accessible name has none.
  const escaped = text.replace(/`/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await page.getByRole('radio', { name: new RegExp(`^[A-E]\\. ${escaped}$`) }).check();
  await page.getByRole('radio', { name: 'Sure', exact: true }).check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByTestId('feedback-option').first()).toBeVisible();
}

function counts(): string {
  return PROGRESS_TABLES.map((t) => `${t}=${sql(`select count(*) from ${t}`)}`).join(',');
}

test.describe.configure({ mode: 'serial' });
test.beforeAll(wipe);
test.afterAll(wipe);

test('AC1: content:validate and content:import on the real content load 150 questions', () => {
  for (const ext of ['', '-wal', '-shm']) fs.rmSync(`${AC1_DB}${ext}`, { force: true });
  const env = { ...process.env, CONTENT_DIR: 'content', DATABASE_PATH: AC1_DB };
  const run = (script: string) =>
    execFileSync('node_modules/.bin/tsx', [script], { env, encoding: 'utf8' });
  expect(run('scripts/validate-content.ts')).toContain('content:validate OK');
  run('scripts/import-content.ts');
  expect(
    execFileSync(
      'sqlite3',
      [AC1_DB, `select count(*) from question where pool = 'practice' and retired = 0`],
      { encoding: 'utf8' },
    ).trim(),
  ).toBe('150');
});

test('AC2: a 10-question S1 session serves S1 questions, shuffled, with the setup shown', async ({
  page,
}) => {
  await start(page, 'scenario=S1&size=10&mode=study&multi=no');
  await expect(page.getByTestId('progress')).toHaveText('1 / 10');
  await expect(page.getByTestId('scenario-setup')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Customer Support Resolution Agent',
  );
  expect(
    sql(
      `select count(*), count(distinct q.scenario_id), min(q.scenario_id) from session_item i
       join question q on q.id = i.question_id where i.session_id = ${latestSessionId}`,
    ),
  ).toBe('10|1|S1');
  const orders = sql(
    `select option_order_json from session_item where session_id = ${latestSessionId}`,
  ).split('\n');
  expect(
    orders.some((o) => {
      const keys = JSON.parse(o) as string[];
      return keys.join('') !== [...keys].sort().join('');
    }),
  ).toBe(true);
});

test('AC3: a multiple-response question needs exactly 2 picks; 1 of 2 is partial and wrong', async ({
  page,
}) => {
  await start(page, 'scenario=S1&size=5&mode=study&multi=only');
  const submit = page.getByRole('button', { name: 'Submit' });
  const boxes = page.getByRole('checkbox');
  await page.getByRole('radio', { name: 'Sure', exact: true }).check();
  await boxes.first().check();
  await expect(submit).toBeDisabled();
  await boxes.first().uncheck();
  const order = JSON.parse(
    sql(
      `select option_order_json from session_item where session_id = ${latestSessionId} and position = 0`,
    ),
  ) as string[];
  const correctKeys = sql(
    `select key from question_option where is_correct = 1 and question_id =
     (select question_id from session_item where session_id = ${latestSessionId})`,
  ).split('\n');
  expect(correctKeys).toHaveLength(2);
  const wrongIndex = order.findIndex((k) => !correctKeys.includes(k));
  await boxes.nth(order.indexOf(correctKeys[0])).check();
  await boxes.nth(wrongIndex).check();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByRole('status')).toHaveText(
    'Partially correct — 1 of 2 correct, counts as wrong',
  );
  expect(
    sql(
      `select is_correct, correct_selected from session_item where session_id = ${latestSessionId} and position = 0`,
    ),
  ).toBe('0|1');
});

test('AC4: study feedback shows every explanation and a trap badge on each wrong trap option', async ({
  page,
}) => {
  await start(page, 'scenario=S1&size=5&mode=study&multi=no');
  await pickAndSubmit(page, false);
  const options = page.getByTestId('feedback-option');
  const total = Number(
    sql(
      `select count(*) from question_option where question_id =
       (select question_id from session_item where session_id = ${latestSessionId})`,
    ),
  );
  await expect(options).toHaveCount(total);
  for (const text of await options.locator('p:nth-of-type(2)').allTextContents()) {
    expect(text.trim().length).toBeGreaterThan(0);
  }
  const trapOptions = Number(
    sql(
      `select count(*) from question_option where is_correct = 0 and trap_id is not null and
       question_id = (select question_id from session_item where session_id = ${latestSessionId})`,
    ),
  );
  expect(trapOptions).toBeGreaterThan(0);
  await expect(page.locator('[data-testid="feedback-option"] a[href*="#trap-"]')).toHaveCount(
    trapOptions,
  );
});

test('AC5: a wrong answer is in Review after 1 day, not before', async ({ page }) => {
  clearProgress();
  await start(page, 'scenario=S1&size=5&mode=study&multi=no');
  await pickAndSubmit(page, false);

  setClockOffset(DAY_MS - MIN_MS);
  await page.goto('/review');
  await expect(page.getByTestId('review-empty')).toContainText('Nothing due');

  setClockOffset(DAY_MS + MIN_MS);
  await page.goto('/review');
  await expect(page.getByTestId('due-count')).toHaveText('1 due');
  setClockOffset(0);
});

test('AC6: the report lists a 0-of-4 task above a 3-of-4 task in the same domain', async ({
  page,
}) => {
  clearProgress();
  seedSession([
    ...['S1-001', 'S1-002', 'S1-003', 'S1-004'].map((questionId) => ({
      questionId,
      correct: false,
    })),
    { questionId: 'S1-005', correct: true },
    { questionId: 'S1-007', correct: true },
    { questionId: 'S1-005', correct: true },
    { questionId: 'S1-007', correct: false },
  ]);
  await page.goto('/report');
  const items = page.getByTestId('priority-item');
  await expect(items.nth(0)).toHaveAttribute('data-task', '1.4');
  await expect(items.nth(0)).toContainText('Accuracy 0% over last 4 answers');
  // Untested tasks (gap 0.5) may sit between them, and 1.5 may fall outside the top 8,
  // so only the relative order is required.
  const tasks = await items.evaluateAll((els) => els.map((e) => e.getAttribute('data-task')));
  const at15 = tasks.indexOf('1.5');
  if (at15 !== -1) expect(at15).toBeGreaterThan(tasks.indexOf('1.4'));
});

test('AC7: a trap picked 3 of 3 ranks above a trap picked 1 of 4', async ({ page }) => {
  clearProgress();
  // ITERATION_CAP appears in S1-002, S1-008 and S2-020 only; FAILURE_TO_ESCALATE in
  // S1-024, S1-025, S2-010 and S2-014 only (no overlap between the two sets).
  seedSession([
    { questionId: 'S1-002', correct: false, pickTrap: 'ITERATION_CAP' },
    { questionId: 'S1-008', correct: false, pickTrap: 'ITERATION_CAP' },
    { questionId: 'S2-020', correct: false, pickTrap: 'ITERATION_CAP' },
    { questionId: 'S1-024', correct: false, pickTrap: 'FAILURE_TO_ESCALATE' },
    { questionId: 'S1-025', correct: true },
    { questionId: 'S2-010', correct: true },
    { questionId: 'S2-014', correct: true },
  ]);
  await page.goto('/report');
  const rows = page.getByTestId('trap-row');
  const names = (await rows.getByTestId('trap-name').allTextContents()).map((n) => n.trim());
  const nameOf = (id: string) => sql(`select name from trap where id = '${id}'`);
  const high = names.indexOf(nameOf('ITERATION_CAP'));
  const low = names.indexOf(nameOf('FAILURE_TO_ESCALATE'));
  expect(high).toBeGreaterThanOrEqual(0);
  expect(low).toBeGreaterThanOrEqual(0);
  expect(high).toBeLessThan(low);
  await expect(rows.nth(high)).toContainText('picked 3 of 3');
  await expect(rows.nth(low)).toContainText('picked 1 of 4');
});

test('AC8: backup, reset and restore give back the same row counts and report numbers', async ({
  page,
}) => {
  clearProgress();
  seedSession([
    { questionId: 'S1-001', correct: true },
    { questionId: 'S1-002', correct: false },
    { questionId: 'S1-003', correct: true },
  ]);
  const before = counts();
  await page.goto('/report');
  const score = await page.getByTestId('readiness-score').textContent();
  const label = await page.getByTestId('readiness-label').textContent();

  await page.goto('/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download backup' }).click(),
  ]);
  const file = await download.path();
  await fsp.access(file);

  await page.getByLabel('Type RESET to confirm').fill('RESET');
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await expect(page.getByTestId('reset-message')).toHaveText('Progress reset');
  expect(sql('select count(*) from session')).toBe('0');

  await page.goto('/settings');
  await page.getByLabel('Backup file').setInputFiles(file);
  await expect(page.getByTestId('restore-preview')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm restore' }).click();
  await expect(page.getByTestId('restore-done')).toBeVisible();

  expect(counts()).toBe(before);
  await page.goto('/report');
  await expect(page.getByTestId('readiness-score')).toHaveText(score ?? '');
  await expect(page.getByTestId('readiness-label')).toHaveText(label ?? '');
});

test('AC9: the D1 and D3 Deep Drill presets serve only that primary domain', async ({ page }) => {
  clearProgress();
  for (const [preset, domain] of [
    ['d1', 'D1'],
    ['d3', 'D3'],
  ]) {
    await start(page, `preset=${preset}&size=25&mode=study`);
    expect(
      sql(
        `select group_concat(distinct q.domain_id) from session_item i
         join question q on q.id = i.question_id where i.session_id = ${latestSessionId}`,
      ),
    ).toBe(domain);
  }
});

test('AC10: a flagged question is listed in Settings, exports as markdown', async ({ page }) => {
  await page.goto('/questions/S1-001');
  await page.getByRole('button', { name: 'Flag this question' }).click();
  await page.getByRole('textbox').fill('acceptance flag');
  await page.getByRole('button', { name: 'Save flag' }).click();
  await expect(page.getByTestId('flag-message')).toHaveText('Flag saved');

  await page.goto('/settings?tab=flags');
  await expect(page.getByTestId('flag-row')).toHaveCount(1);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export as markdown' }).click(),
  ]);
  const md = fs.readFileSync((await download.path())!, 'utf8');
  expect(md).toContain('## S1-001');
  expect(md).toContain('acceptance flag');
});
