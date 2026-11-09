import { expect, test, type Page } from '@playwright/test';
import { latestSessionId, sql } from './helpers/db';

async function start(page: Page, preset: string): Promise<void> {
  await page.goto(`/practice?preset=${preset}&size=25&mode=study`);
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
}

function sessionDomains(): string[] {
  return sql(
    `select distinct q.domain_id from session_item i join question q on q.id = i.question_id
     where i.session_id = ${latestSessionId}`,
  ).split('\n');
}

test.beforeAll(() => {
  sql(`delete from session_item; delete from session; delete from review_item;`);
});

test('D1 Deep Drill serves only D1-primary questions', async ({ page }) => {
  await start(page, 'd1');
  expect(sessionDomains()).toEqual(['D1']);
  expect(
    sql(
      `select count(*) from session_item i join question_task t
       on t.question_id = i.question_id and t.is_primary = 1
       where i.session_id = ${latestSessionId} and t.task_id not like '1.%'`,
    ),
  ).toBe('0');
});

test('D3 Deep Drill serves only D3-primary questions', async ({ page }) => {
  await start(page, 'd3');
  expect(sessionDomains()).toEqual(['D3']);
});

test('Trap Buster and Blind Spots show reasons and cannot start with no progress', async ({
  page,
}) => {
  await page.goto('/practice?preset=traps');
  await expect(page.getByText('Answer more questions to find your top traps')).toBeVisible();
  await expect(page.getByText('No blind spots yet')).toBeVisible();
  await expect(page.getByRole('button', { name: /start/i })).toBeDisabled();
  await page.goto('/practice?preset=blind');
  await expect(page.getByRole('button', { name: /start/i })).toBeDisabled();
});
