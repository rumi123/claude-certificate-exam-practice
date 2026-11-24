import { expect, test } from '@playwright/test';
import { clearProgress, seedSession } from './helpers/seed';

test.use({ viewport: { width: 375, height: 812 } });
test.describe.configure({ mode: 'serial' });

const PATHS = [
  '/',
  '/practice',
  '/exams',
  '/learn',
  '/review',
  '/report',
  '/flashcards',
  '/cheatsheet',
  '/questions',
  '/questions/S1-001',
  '/settings',
  '/settings?tab=flags',
  '/settings?tab=preferences',
  '/research',
];

let summaryPath = '';

test.beforeAll(() => {
  clearProgress();
  const id = seedSession([
    { questionId: 'S1-001', correct: true },
    { questionId: 'S1-002', correct: false },
    { questionId: 'S1-003', correct: true },
  ]);
  summaryPath = `/practice/${id}`;
});
test.afterAll(clearProgress);

async function expectNoOverflow(page: import('@playwright/test').Page) {
  await page.locator('h1').first().waitFor();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(375);
}

for (const path of PATHS) {
  test(`no horizontal overflow at 375px: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expectNoOverflow(page);
  });
}

test('no horizontal overflow at 375px: runner', async ({ page }) => {
  await page.goto('/practice?scenario=S1&size=5&mode=study&multi=no');
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
  await expectNoOverflow(page);
});

test('no horizontal overflow at 375px: finished session summary', async ({ page }) => {
  await page.goto(summaryPath);
  await expectNoOverflow(page);
});
