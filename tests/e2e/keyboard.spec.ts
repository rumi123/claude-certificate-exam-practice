import { expect, test } from '@playwright/test';
import { latestSessionId, sql } from './helpers/db';

test('2, S, Enter submit option B with confidence Sure; M toggles the mark', async ({ page }) => {
  await page.goto('/practice?scenario=S1&size=5&mode=study&multi=no');
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
  await expect(page.getByTestId('progress')).toHaveText('1 / 5');

  await page.keyboard.press('2');
  await expect(page.getByRole('radio').nth(1)).toBeChecked();
  await page.keyboard.press('s');
  await expect(page.getByRole('radio', { name: 'Sure', exact: true })).toBeChecked();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toBeVisible();

  const row = sql(
    `select option_order_json, selected_json, confidence from session_item where session_id=${latestSessionId} and position=0`,
  ).split('|');
  const order = JSON.parse(row[0]) as string[];
  expect(JSON.parse(row[1])).toEqual([order[1]]);
  expect(row[2]).toBe('sure');

  const mark = page.getByRole('button', { name: /learn later$/ });
  await expect(mark).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('m');
  await expect(mark).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() =>
      sql(`select marked from session_item where session_id=${latestSessionId} and position=0`),
    )
    .toBe('1');
  await page.keyboard.press('m');
  await expect(mark).toHaveAttribute('aria-pressed', 'false');
  await expect
    .poll(() =>
      sql(`select marked from session_item where session_id=${latestSessionId} and position=0`),
    )
    .toBe('0');

  // Enter is ignored while the mark's server action is still pending, so retry until it lands.
  await expect(async () => {
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('progress')).toHaveText('2 / 5', { timeout: 1000 });
  }).toPass();
});
