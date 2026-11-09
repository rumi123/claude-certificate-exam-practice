import { expect, test } from '@playwright/test';
import { latestSessionId, sql } from './helpers/db';
import { clearProgress, seedSession } from './helpers/seed';

const T14 = ['S1-001', 'S1-002', 'S1-003', 'S1-004'];

test.describe.configure({ mode: 'serial' });
test.beforeAll(clearProgress);

test('empty progress: every section has its empty state, readiness is 100', async ({ page }) => {
  await page.goto('/report');
  for (const name of [
    'Summary',
    'What to improve',
    'Domains',
    'Task statements',
    'Trap profile',
    'Calibration',
    'Timing',
    'Scenarios',
  ]) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  await expect(page.getByTestId('readiness-score')).toHaveText('100');
  await expect(page.getByTestId('readiness')).toContainText('Estimate');
  await expect(page.getByTestId('readiness-label')).toHaveText('Low data');
  await expect(page.getByTestId('empty-improve')).toContainText(
    'Answer 3+ questions on a task to see it here',
  );
  await expect(page.getByTestId('empty-timing')).toHaveText('No answers yet');
});

test('seeded history ranks 1.4 above 1.5 with its reasons', async ({ page }) => {
  seedSession([
    ...T14.map((questionId) => ({ questionId, correct: false })),
    // S1-006 is tagged secondary 1.4, so 1.5's answers avoid it to keep 1.4 at exactly 4.
    // Newest answers are wrong, so 1.5's mastery (about 0.19) gives a gap above the 0.5
    // that untested tasks get, and it ranks second.
    { questionId: 'S1-005', correct: true },
    { questionId: 'S1-007', correct: false },
    { questionId: 'S1-005', correct: false },
    { questionId: 'S1-007', correct: false },
  ]);
  await page.goto('/report');
  const items = page.getByTestId('priority-item');
  await expect(items.nth(0)).toHaveAttribute('data-task', '1.4');
  await expect(items.nth(1)).toHaveAttribute('data-task', '1.5');
  await expect(items.nth(0)).toContainText('Accuracy 0% over last 4 answers');
  await expect(items.nth(0)).toContainText('4 blind spots');
});

test('Drill this task opens a runner on that task only', async ({ page }) => {
  await page.goto('/report');
  await page
    .getByTestId('priority-item')
    .first()
    .getByRole('button', { name: 'Drill this task' })
    .click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
  expect(
    sql(
      `select group_concat(distinct q.primary_task_id), count(*) from session_item i
       join question q on q.id = i.question_id where i.session_id = ${latestSessionId}`,
    ),
  ).toBe('1.4|4');
});

test('task table sorts by mastery and filters untested', async ({ page }) => {
  await page.goto('/report');
  const rows = page.getByTestId('task-row');
  await expect(rows).toHaveCount(30);
  await page.getByRole('button', { name: /^Mastery/ }).click();
  await expect(rows.first()).toHaveAttribute('data-task', '1.4');
  await page.getByLabel('Untested only').check();
  await expect(page.locator('[data-testid="task-row"][data-task="1.4"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="task-row"][data-task="1.5"]')).toHaveCount(0);
});
