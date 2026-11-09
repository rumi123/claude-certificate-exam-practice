import { expect, test } from '@playwright/test';
import { latestSessionId, sql } from './helpers/db';

test.beforeAll(() => {
  sql('delete from question_flag; delete from session_item; delete from session;');
});

test('browser lists 50 questions on 2 pages and filters them', async ({ page }) => {
  await page.goto('/questions');
  await expect(page.getByTestId('question-count')).toHaveText('50 questions');
  await expect(page.getByTestId('page-info')).toHaveText('Page 1 of 2');

  await page.goto('/questions?scenario=S2');
  await expect(page.getByTestId('question-count')).toHaveText('25 questions');

  await page.goto('/questions?type=multi');
  await expect(page.getByTestId('question-count')).toHaveText('10 questions');

  await page.goto('/questions?q=get_customer');
  const rows = page.getByTestId('question-row');
  expect(await rows.count()).toBeGreaterThanOrEqual(1);
  for (const id of await rows.locator('td:first-child').allTextContents()) {
    expect(id.trim()).toMatch(/^S1-/);
  }
});

test('detail page shows options, explanations and trap badges; flagging works', async ({
  page,
}) => {
  await page.goto('/questions/S1-001');
  const options = page.getByTestId('feedback-option');
  await expect(options).toHaveCount(4);
  await expect(page.getByRole('img', { name: 'Correct option' })).toHaveCount(1);
  for (const text of await options.locator('p:nth-of-type(2)').allTextContents()) {
    expect(text.trim().length).toBeGreaterThan(0);
  }
  await expect(page.locator('a[href^="/cheatsheet#trap-"]')).toHaveCount(3);

  await page.getByRole('button', { name: 'Flag this question' }).click();
  await page.getByRole('textbox').fill('test flag');
  await page.getByRole('button', { name: 'Save flag' }).click();
  await expect(page.getByTestId('flag-message')).toHaveText('Flag saved');

  await page.goto('/questions?flagged=1');
  await expect(page.getByTestId('question-row')).toHaveCount(1);
  await expect(page.getByTestId('question-row')).toContainText('S1-001');
  expect(sql('select question_id, note, resolved from question_flag')).toBe('S1-001|test flag|0');
});

test('answer history shows the letter and confidence', async ({ page }) => {
  await page.goto('/questions/S1-001');
  await expect(page.getByTestId('history-row')).toHaveCount(0);

  await page.goto('/practice?scenario=S1&size=5&mode=study&multi=no');
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
  await page.getByRole('radio').first().check();
  await page.getByRole('radio', { name: 'Sure', exact: true }).check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByTestId('feedback-option').first()).toBeVisible();
  const id = sql(
    `select question_id from session_item where session_id=${latestSessionId} and position=0`,
  );

  await page.goto(`/questions/${id}`);
  const row = page.getByTestId('history-row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('A');
  await expect(row).toContainText('sure');
});
