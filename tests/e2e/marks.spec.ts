import { expect, test, type Page } from '@playwright/test';
import { latestSessionId, sql } from './helpers/db';
import { clearProgress } from './helpers/seed';

test.beforeEach(() => clearProgress());

async function finishExam(page: Page) {
  await page.goto('/practice?scenario=S1&size=5&mode=test&multi=no');
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
  for (let n = 1; n <= 5; n++) {
    await expect(page.getByTestId('progress')).toHaveText(`${n} / 5`);
    if (n === 2) {
      await page.getByRole('button', { name: 'Mark to learn later' }).click();
      await expect(page.getByRole('button', { name: 'Marked to learn later' })).toBeVisible();
    }
    await page.getByRole('radio').first().check();
    await page.getByRole('radio', { name: 'Sure', exact: true }).check();
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(
      page.locator('[data-testid="nav-item"][data-state="answered"]'),
    ).toHaveCount(n);
  }
  // Everything is answered, so finishing skips the confirm dialog.
  await page.getByTestId('finish-button').click();
  await page.waitForURL(/\/summary$/);
}

test('marks survive the exam and can be filtered and cleared on the results page', async ({
  page,
}) => {
  await finishExam(page);
  const filter = page.getByTestId('results-filter');
  await expect(filter.getByRole('tab', { name: 'Marked 1' })).toBeVisible();
  expect(
    sql(
      `select position, marked from session_item where session_id=${latestSessionId} and marked=1`,
    ),
  ).toBe('1|1');

  await filter.getByRole('tab', { name: 'Marked 1' }).click();
  const items = page.getByTestId('summary-item');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toHaveAttribute('data-marked', 'true');
  await expect(items.first()).toContainText('2.');

  await items.first().locator('summary').click();
  await items.first().getByRole('button', { name: 'Unmark' }).click();
  await expect
    .poll(() =>
      sql(`select count(*) from session_item where session_id=${latestSessionId} and marked=1`),
    )
    .toBe('0');
  await page.reload();
  await expect(filter.getByRole('tab', { name: 'Marked 0' })).toBeVisible();
  await expect(page.getByText('No questions in this filter.')).toBeVisible();
});

test('Questions page filters marked questions and the question page clears the mark', async ({
  page,
}) => {
  await finishExam(page);
  await page.getByTestId('summary-item').first().locator('summary').click();
  await page.getByTestId('summary-item').first().getByRole('button', { name: 'Mark' }).click();
  await expect
    .poll(() =>
      sql(`select count(*) from session_item where session_id=${latestSessionId} and marked=1`),
    )
    .toBe('2');
  // Both marked items are distinct questions; unmark one so exactly one row is expected.
  await page.getByTestId('summary-item').first().getByRole('button', { name: 'Unmark' }).click();
  await expect
    .poll(() =>
      sql(`select count(*) from session_item where session_id=${latestSessionId} and marked=1`),
    )
    .toBe('1');

  await page.goto('/questions?marked=1');
  const rows = page.getByTestId('question-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Marked');
  await rows.first().getByRole('link').click();
  await page.getByRole('button', { name: 'Clear mark' }).click();
  await expect(page.getByRole('button', { name: 'Clear mark' })).toHaveCount(0);
  await page.goto('/questions?marked=1');
  await expect(page.getByTestId('question-row')).toHaveCount(0);
});

test('the Wrong tab lists unanswered and wrong items', async ({ page }) => {
  await finishExam(page);
  const wrong = Number(
    sql(
      `select count(*) from session_item where session_id=${latestSessionId} and (is_correct is null or is_correct=0)`,
    ),
  );
  await page.getByTestId('results-filter').getByRole('tab', { name: `Wrong ${wrong}` }).click();
  await expect(page.getByTestId('summary-item')).toHaveCount(wrong);
});
