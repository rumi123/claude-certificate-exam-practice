import { expect, test, type Page } from '@playwright/test';
import { latestSessionId, sql } from './helpers/db';

// Tests 2-4 drive the practice UI built in M6 (setup form, runner, feedback panel).
async function answerFirstQuestionInStudyMode(page: Page) {
  await page.goto('/practice?scenario=S1&size=10&mode=study&multi=no');
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+/);
  await page.getByRole('radio').first().check();
  await page.getByRole('radio', { name: 'Sure', exact: true }).check();
  await page.getByRole('button', { name: 'Submit' }).click();
}

test('research page has an anchor per task statement', async ({ page }) => {
  await page.goto('/research');
  await expect(page.locator('[id^="task-"]')).toHaveCount(30);
  await expect(page.locator('#task-1-4')).toContainText('Task 1.4:');
});

test('decision sheet has all sections', async ({ page }) => {
  await page.goto('/cheatsheet');
  await expect(page.getByTestId('decision-row')).toHaveCount(33);
  await expect(page.getByTestId('always-wrong-row')).toHaveCount(10);
  await expect(page.locator('[id^="trap-"]')).toHaveCount(20);
  await expect(page.getByTestId('keyfact-group')).toHaveCount(5);
});

test('feedback "Read" link lands on the primary task in the research page', async ({ page }) => {
  await answerFirstQuestionInStudyMode(page);
  await page.getByRole('link', { name: 'Read', exact: true }).click();
  await expect(page).toHaveURL(/\/research#task-\d-\d$/);
  const id = new URL(page.url()).hash.slice(1);
  await expect(page.locator(`#${id}`)).toBeInViewport();
});

test('feedback trap badge links to the decision sheet', async ({ page }) => {
  await answerFirstQuestionInStudyMode(page);
  await page.locator('a[href^="/cheatsheet#trap-"]').first().click();
  await expect(page).toHaveURL(/\/cheatsheet#trap-[A-Z_]+$/);
});

test('decision row Drill button starts a 10-question drill on that task', async ({ page }) => {
  await page.goto('/cheatsheet');
  const row = page.getByTestId('decision-row').first();
  const task = (await row.getByRole('link').first().textContent())!.trim();
  await row.getByRole('button', { name: 'Drill' }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
  expect(
    sql(
      `select count(*) from session_item i join question q on q.id = i.question_id
       where i.session_id = ${latestSessionId} and q.primary_task_id <> '${task}'`,
    ),
  ).toBe('0');
});
