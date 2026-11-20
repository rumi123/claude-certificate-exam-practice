import { expect, test, type Page } from '@playwright/test';
import { clearProgress, seedSession } from './helpers/seed';

test.use({ viewport: { width: 1888, height: 886 } });
test.describe.configure({ mode: 'serial' });

const PATHS = [
  '/',
  '/practice',
  '/review',
  '/report',
  '/flashcards',
  '/cheatsheet',
  '/questions',
  '/questions/S1-001',
  '/settings',
  '/settings?tab=flags',
  '/settings?tab=preferences',
  '/settings?tab=about',
  '/research',
];

let sessionPath = '';

test.beforeAll(() => {
  clearProgress();
  const id = seedSession([
    { questionId: 'S1-001', correct: true },
    { questionId: 'S1-002', correct: false },
    { questionId: 'S1-003', correct: true },
  ]);
  sessionPath = `/practice/${id}`;
});
test.afterAll(clearProgress);

async function expectNoHorizontalOverflow(page: Page) {
  await page.locator('h1').first().waitFor();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(1888);
}

test('main is 1536px wide', async ({ page }) => {
  await page.goto('/');
  const box = await page.locator('main').boundingBox();
  expect(box?.width).toBe(1536);
});

test('/practice does not scroll vertically', async ({ page }) => {
  await page.goto('/practice');
  await page.locator('h1').first().waitFor();
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollHeight,
    client: document.documentElement.clientHeight,
  }));
  expect(scroll).toBeLessThanOrEqual(client);
});

for (const path of PATHS) {
  test(`no horizontal overflow on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expectNoHorizontalOverflow(page);
  });
}

test('no horizontal overflow on the session summary', async ({ page }) => {
  await page.goto(sessionPath);
  await expectNoHorizontalOverflow(page);
});

test('no horizontal overflow on the runner', async ({ page }) => {
  await page.goto('/practice?scenario=S1&size=5&mode=study&multi=no');
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
  await expectNoHorizontalOverflow(page);
});
