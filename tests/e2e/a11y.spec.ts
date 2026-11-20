import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { sql } from './helpers/db';

const PAGES = [
  '/',
  '/report',
  '/practice',
  '/review',
  '/exams',
  '/questions',
  '/flashcards',
  '/cheatsheet',
  '/learn',
  '/questions/S1-002',
];

async function expectNoSeriousViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual(
    [],
  );
}

test.beforeAll(() => {
  sql('delete from session_item; delete from session; delete from review_item;');
});

for (const path of PAGES) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expectNoSeriousViolations(page);
  });
}

test('axe: runner and feedback panel', async ({ page }) => {
  await page.goto('/practice?scenario=S1&size=5&mode=study&multi=no');
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
  await expect(page.getByTestId('progress')).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.getByRole('radio').first().check();
  await page.getByRole('radio', { name: 'Sure', exact: true }).check();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('axe: abandon dialog; Esc closes it and keeps the session in progress', async ({ page }) => {
  await page.goto('/practice?scenario=S1&size=5&mode=study&multi=no');
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
  await page.getByRole('button', { name: 'Abandon' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).toHaveURL(/\/practice\/[^/?]+$/);
  expect(sql('select status from session order by started_at desc limit 1')).toBe('in_progress');
});
