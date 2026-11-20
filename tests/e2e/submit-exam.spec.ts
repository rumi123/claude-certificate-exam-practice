import { expect, test, type Page } from '@playwright/test';
import { latestSessionId, sql } from './helpers/db';
import { clearProgress } from './helpers/seed';

test.beforeEach(() => clearProgress());

async function start(page: Page, query: string) {
  await page.goto(`/practice?${query}`);
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
}

async function answer(page: Page, n: number, total: number) {
  await expect(page.getByTestId('progress')).toHaveText(`${n} / ${total}`);
  await page.getByRole('radio').first().check();
  await page.getByRole('radio', { name: 'Sure', exact: true }).check();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
}

test('test mode turns the finish button into a primary Submit exam once all are answered', async ({
  page,
}) => {
  await start(page, 'domain=D1&size=5&mode=test&timer=on&multi=no');
  const sessionId = sql(`select ${latestSessionId}`);
  for (let n = 1; n <= 4; n++) await answer(page, n, 5);
  await expect(page.getByTestId('progress')).toHaveText('5 / 5');

  const finish = page.getByTestId('finish-button');
  await expect(page.getByTestId('all-answered')).toHaveCount(0);
  await expect(finish).toHaveText('Submit exam');
  await expect(finish).not.toHaveClass(/bg-accent/);

  await answer(page, 5, 5);
  const banner = page.getByTestId('all-answered');
  await expect(banner).toHaveText(/All 5 answered\. Submit to see your results\./);
  await expect(finish).toHaveClass(/bg-accent/);

  await banner.getByRole('button', { name: 'Submit exam' }).click();
  await page.waitForURL(/\/summary$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(sql(`select status from session where id='${sessionId}'`)).toBe('completed');
});

test('study mode keeps Finish session and shows no submit banner', async ({ page }) => {
  await start(page, 'scenario=S1&size=5&mode=study&multi=no');
  for (let n = 1; n <= 5; n++) {
    await expect(page.getByTestId('progress')).toHaveText(`${n} / 5`);
    await page.getByRole('radio').first().check();
    await page.getByRole('radio', { name: 'Sure', exact: true }).check();
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    if (n < 5) await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Finish session' })).toBeVisible();
  await expect(page.getByTestId('all-answered')).toHaveCount(0);
});
