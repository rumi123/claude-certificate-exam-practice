import { expect, test, type Page } from '@playwright/test';
import { DAY_MS, setClockOffset, sql } from './helpers/db';

const MIN_MS = 60_000;

function resetProgress(): void {
  sql(`delete from session_item; delete from session; delete from review_item;`);
  setClockOffset(0);
}

async function pick(page: Page, correct: boolean): Promise<void> {
  const text = sql(
    `select o.text from question_option o join session_item i on i.question_id = o.question_id
     where i.session_id = (select id from session order by started_at desc limit 1)
     and o.is_correct = ${correct ? 1 : 0} limit 1`,
  );
  // InlineText renders backticks as <code>, so the accessible name has none.
  const escaped = text.replace(/`/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await page.getByRole('radio', { name: new RegExp(`^[A-E]\\. ${escaped}$`) }).check();
  await page.getByRole('radio', { name: 'Sure', exact: true }).check();
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByTestId('feedback-option').first()).toBeVisible();
}

test.describe.configure({ mode: 'serial' });
test.beforeAll(resetProgress);
test.afterAll(() => setClockOffset(0)); // keep rows so the milestone data check (#5) can read them

test('a wrong answer schedules a review in 24 h, not before', async ({ page }) => {
  await page.goto('/practice?scenario=S1&size=5&mode=study&multi=no');
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
  await pick(page, false);

  await page.goto('/review');
  await expect(page.getByTestId('review-empty')).toContainText('Nothing due');
  await expect(page.getByTestId('review-empty')).toContainText('Next review:');
  await expect(page.getByTestId('review-badge')).toHaveCount(0);

  setClockOffset(DAY_MS - MIN_MS);
  await page.reload();
  await expect(page.getByTestId('review-empty')).toContainText('Nothing due');
});

test('due after 24 h 1 m: badge, start, correct answer moves it to box 2', async ({ page }) => {
  setClockOffset(DAY_MS + MIN_MS);
  await page.goto('/review');
  await expect(page.getByTestId('due-count')).toHaveText('1 due');
  await expect(page.getByTestId('review-badge')).toHaveText('1');
  await expect(page.getByRole('link', { name: 'Review, 1 due' })).toBeVisible();

  const wrongQuestion = sql(`select question_id from review_item`);
  await page.getByRole('button', { name: 'Start review' }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
  expect(
    sql(`select question_id, kind from session_item join session on id = session_id
         where session_id = (select id from session order by started_at desc limit 1)`),
  ).toBe(`${wrongQuestion}|review`);
  await pick(page, true);

  await page.goto('/review');
  await expect(page.getByTestId('box-2')).toContainText('1');
  await expect(page.getByTestId('review-empty')).toContainText('Nothing due');
  expect(sql(`select box, lapses, retired_at is null from review_item`)).toBe('2|0|1');
});
