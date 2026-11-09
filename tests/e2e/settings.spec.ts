import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { sql } from './helpers/db';
import { seedSession } from './helpers/seed';

function wipe() {
  sql(
    `delete from session_item; delete from session; delete from review_item;
     delete from question_flag; delete from flashcard_state; delete from setting where key like 'pref.%';`,
  );
}

test.beforeAll(wipe);
test.afterAll(wipe);

test('backup, reset and restore keep the report numbers', async ({ page }) => {
  seedSession([
    { questionId: 'S1-001', correct: true },
    { questionId: 'S1-002', correct: false },
    { questionId: 'S1-003', correct: true },
  ]);
  await page.goto('/report');
  const score = await page.getByTestId('readiness-score').textContent();
  const label = await page.getByTestId('readiness-label').textContent();
  // 3 answers is far below the 150 needed for a higher label, so only compare before and after.
  expect(sql('select count(*) from session_item')).toBe('3');

  await page.goto('/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download backup' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^ccaf-backup-\d{8}\.json$/);
  const file = await download.path();

  await page.getByLabel('Type RESET to confirm').fill('RESET');
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await expect(page.getByTestId('reset-message')).toHaveText('Progress reset');
  await page.goto('/report');
  await expect(page.getByTestId('readiness-label')).toHaveText('Low data');
  expect(sql('select count(*) from session')).toBe('0');

  await page.goto('/settings');
  await page.getByLabel('Backup file').setInputFiles(file);
  await expect(page.getByTestId('restore-preview')).toBeVisible();
  await expect(page.getByTestId('count-session')).toHaveText('1');
  await expect(page.getByTestId('count-session_item')).toHaveText('3');
  await page.getByRole('button', { name: 'Confirm restore' }).click();
  await expect(page.getByTestId('restore-done')).toBeVisible();

  await page.goto('/report');
  await expect(page.getByTestId('readiness-score')).toHaveText(score ?? '');
  await expect(page.getByTestId('readiness-label')).toHaveText(label ?? '');
});

test('restore rejects a backup with an unknown question', async ({ page }) => {
  await page.goto('/settings');
  await page.getByLabel('Backup file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'ccaf-backup', schemaVersion: 2 })),
  });
  await expect(page.getByTestId('restore-errors')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm restore' })).toHaveCount(0);
});

test('reset button stays disabled until RESET is typed', async ({ page }) => {
  await page.goto('/settings');
  await page.getByLabel('Type RESET to confirm').fill('reset');
  await expect(page.getByRole('button', { name: 'Reset progress' })).toBeDisabled();
  await page.getByLabel('Type RESET to confirm').fill('RESET');
  await expect(page.getByRole('button', { name: 'Reset progress' })).toBeEnabled();
});

test('flags export as markdown and resolve', async ({ page }) => {
  await page.goto('/questions/S1-001');
  await page.getByRole('button', { name: 'Flag this question' }).click();
  await page.getByRole('textbox').fill('test flag');
  await page.getByRole('button', { name: 'Save flag' }).click();
  await expect(page.getByTestId('flag-message')).toHaveText('Flag saved');

  await page.goto('/settings?tab=flags');
  await expect(page.getByTestId('flag-row')).toHaveCount(1);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export as markdown' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^flags-\d{8}\.md$/);
  const md = fs.readFileSync((await download.path())!, 'utf8');
  expect(md).toContain('## S1-001');
  expect(md).toContain('test flag');

  await page.getByRole('button', { name: 'Resolve' }).click();
  await expect(page.getByTestId('no-flags')).toBeVisible();
  expect(sql('select resolved from question_flag')).toBe('1');
});

test('preferences set the practice defaults and the theme', async ({ page }) => {
  await page.goto('/settings?tab=preferences');
  await page.getByLabel('Default session size').fill('25');
  await page.getByLabel('Default mode').selectOption('test');
  await page.getByLabel('Theme').selectOption('dark');
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.getByTestId('prefs-message')).toHaveText('Saved');
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.goto('/practice');
  // The labels wrap their select, so the label text includes the option text.
  await expect(page.locator('label').filter({ hasText: /^Size/ }).locator('select')).toHaveValue(
    '25',
  );
  await expect(page.getByRole('radio', { name: /^Test/ })).toBeChecked();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('about tab shows the AI line and content versions; AI route is 501', async ({
  page,
  request,
}) => {
  await page.goto('/settings?tab=about');
  await expect(page.getByTestId('ai-status')).toContainText('AI_FEATURES=on');
  await expect(page.getByTestId('last-import')).not.toHaveText('Last import: never');
  const res = await request.post('/api/ai/explain');
  expect(res.status()).toBe(501);
  expect(await res.json()).toEqual({ error: 'AI features are off' });
});
