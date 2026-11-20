import { expect, test } from '@playwright/test';
import { latestSessionId, sql } from './helpers/db';
import { clearProgress, seedSession } from './helpers/seed';

test.beforeEach(() => clearProgress());

test('Exams lists a finished test and opens its results page', async ({ page }) => {
  await page.goto('/practice?scenario=S1&size=5&mode=test&multi=no');
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
  for (let n = 1; n <= 5; n++) {
    await expect(page.getByTestId('progress')).toHaveText(`${n} / 5`);
    await page.getByRole('radio').first().check();
    await page.getByRole('radio', { name: 'Sure', exact: true }).check();
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.locator('[data-testid="nav-item"][data-state="answered"]')).toHaveCount(n);
  }
  await page.getByTestId('finish-button').click();
  await page.waitForURL(/\/summary$/);
  const id = sql(`select ${latestSessionId}`);
  const correct = sql(
    `select count(*) from session_item where session_id='${id}' and is_correct=1`,
  );

  await page.goto('/exams');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Exams');
  const row = page.getByTestId('exam-row').first();
  await expect(row).toContainText('Test');
  await expect(row).toContainText('Customer Support Resolution Agent');
  await expect(row).toContainText(`${correct} / 5`);

  await row.click();
  await expect(page).toHaveURL(new RegExp(`/practice/${id}/summary$`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Exam results');
  await expect(page.getByRole('link', { name: 'Back to Exams' })).toHaveAttribute('href', '/exams');
});

test('mode tabs filter the list and the empty state shows', async ({ page }) => {
  await page.goto('/exams?mode=study');
  await expect(page.getByText('No finished exams yet')).toBeVisible();

  const qid = sql('select id from question order by id limit 1');
  seedSession([{ questionId: qid, correct: true }], Date.now() - 20_000, { mode: 'test' });
  seedSession([{ questionId: qid, correct: false }], Date.now() - 10_000, {
    mode: 'study',
    status: 'abandoned',
    marked: [0],
  });

  await page.goto('/exams');
  await expect(page.getByTestId('exam-row')).toHaveCount(2);
  await page.getByRole('tab', { name: 'Study', exact: true }).click();
  const rows = page.getByTestId('exam-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Study');
  await expect(rows.first()).toContainText('Abandoned');
  await expect(rows.first()).toContainText('1 marked');
  await expect(rows.first()).not.toContainText('Test');
  await page.getByRole('tab', { name: 'Test', exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Test');
  await expect(rows.first()).not.toContainText('Study');

  await page.goto('/exams?mode=study');
  await page.getByTestId('exam-row').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Session summary');
});
