import { expect, test } from '@playwright/test';
import { latestSessionId, sql } from './helpers/db';
import { clearProgress } from './helpers/seed';

test.beforeEach(() => clearProgress());
test.afterAll(() => clearProgress());

const poolTotal = (pool: string) =>
  sql(`select count(*) from question where pool = '${pool}' and retired = 0`);

test('the New question set source lists each paper with its progress', async ({ page }) => {
  await page.goto('/practice');
  await page.getByLabel('Source').selectOption('mock');
  await expect(page.getByRole('radio', { name: /Paper 1/ })).toBeChecked();
  const total = poolTotal('mock-1');
  await expect(page.getByTestId('progress-mock-1')).toHaveText(`${total} of ${total} left`);
  await expect(page.getByTestId('available')).toHaveText(`${total} questions available`);
});

test('other sources count the practice pool only', async ({ page }) => {
  await page.goto('/practice');
  await expect(page.getByTestId('available')).toHaveText(
    `${poolTotal('practice')} questions available`,
  );
});

test('a paper session holds only paper questions through feedback and summary', async ({
  page,
}) => {
  await page.goto('/practice?size=5&mode=study&multi=no');
  await page.getByLabel('Source').selectOption('mock');
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);

  const ids = sql(
    `select question_id from session_item where session_id = ${latestSessionId}`,
  ).split('\n');
  expect(ids).toHaveLength(5);
  for (const id of ids) expect(id).toMatch(/^M1-S\d-\d{3}$/);

  await page.getByRole('radio').first().check();
  await page.getByRole('radio', { name: 'Sure', exact: true }).check();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('status')).toBeVisible();
  const options = page.getByTestId('feedback-option');
  expect([4, 5]).toContain(await options.count());
  for (const text of await options.locator('p:nth-of-type(2)').allTextContents()) {
    expect(text.trim().length).toBeGreaterThan(0);
  }

  await page.getByRole('button', { name: 'Finish session' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Finish', exact: true }).click();
  await page.waitForURL(/\/summary$/);
  await expect(page.getByRole('heading').first()).toBeVisible();
});
