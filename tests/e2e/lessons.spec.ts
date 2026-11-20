import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import { sql } from './helpers/db';
import { seedOpenSession, seedSession } from './helpers/seed';

const lessons = JSON.parse(fs.readFileSync('tests/fixtures/content/lessons/d1.json', 'utf8')) as {
  lessons: {
    questionId: string;
    eliminate: { option: string; reason: string }[];
    sources: unknown[];
  }[];
};
const lesson = lessons.lessons.find((l) => l.questionId === 'S1-002')!;

const HEADINGS = [
  'The question explained',
  'The concept',
  'How to read the stem',
  'What to look for in the answers',
  'Ruling out each wrong answer',
  'Rule to remember',
  'Sources',
];

test.beforeEach(() => {
  sql('delete from session_item; delete from session; delete from review_item;');
});

test('question page shows the whole teaching section', async ({ page }) => {
  await page.goto('/questions/S1-002');
  const teaching = page.getByTestId('teaching');
  await expect(teaching).toBeVisible();
  await expect(teaching.getByRole('heading', { level: 3 })).toHaveText(HEADINGS);
  const links = teaching.getByRole('link');
  await expect(links).toHaveCount(lesson.sources.length);
  for (const a of await links.all()) await expect(a).toHaveAttribute('target', '_blank');
  const chips = page.getByTestId('option-status');
  await expect(chips.filter({ hasText: /^Correct$/ })).toHaveCount(1);
  await expect(chips.filter({ hasText: /^Wrong$/ })).toHaveCount(3);
});

test('study submit labels the options and uses display letters', async ({ page }) => {
  const id = seedOpenSession('S1-002', ['d', 'c', 'b', 'a'], 'study');
  await page.goto(`/practice/${id}`);
  await page.getByRole('radio').first().check();
  await page.getByRole('radio', { name: 'Sure', exact: true }).check();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.getByRole('button', { name: 'Show reasoning' }).click();

  const options = page.getByTestId('feedback-option');
  await expect(options.nth(0).getByTestId('option-status')).toHaveText('You chose · wrong');
  await expect(options.nth(3).getByTestId('option-status')).toHaveText('Correct · you missed it');

  const teaching = page.getByTestId('teaching');
  await expect(teaching).toHaveCount(1);
  const rows = teaching.locator('h3', { hasText: 'Ruling out' }).locator('+ ul > li');
  await expect(rows).toHaveCount(3);
  const letters = await rows.locator('span.font-mono').allTextContents();
  expect(letters).toEqual(['A', 'B', 'C']);
  const reasonD = lesson.eliminate.find((e) => e.option === 'd')!.reason;
  await expect(rows.first()).toContainText(reasonD);
});

test('test-mode summary shows the teaching section', async ({ page }) => {
  const id = seedSession([{ questionId: 'S1-002', correct: false }]);
  await page.goto(`/practice/${id}/summary`);
  await page.locator('summary', { hasText: 'Wrong' }).click();
  await expect(page.getByTestId('teaching')).toBeVisible();
});

test('a question without a lesson looks as before', async ({ page }) => {
  await page.goto('/questions/S1-001');
  await expect(page.getByTestId('teaching')).toHaveCount(0);
  const explanations = await page
    .getByTestId('feedback-option')
    .locator('p:nth-of-type(2)')
    .allTextContents();
  const want = sql(
    `select explanation from question_option where question_id = 'S1-001' order by position`,
  ).split('\n');
  // InlineText renders `code` spans without the backticks.
  expect(explanations.map((t) => t.trim())).toEqual(want.map((t) => t.replaceAll('`', '').trim()));
});

test('teaching section fits a 400 px screen', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 900 });
  await page.goto('/questions/S1-002');
  await expect(page.getByTestId('teaching')).toBeVisible();
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(client);
  // Wide tables scroll inside their own box instead of widening the page.
  const wrappers = page.getByTestId('teaching').locator('table').locator('xpath=..');
  const n = await wrappers.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    await expect(wrappers.nth(i)).toHaveCSS('overflow-x', 'auto');
  }
});
