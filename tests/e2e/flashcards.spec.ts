import { expect, test } from '@playwright/test';

test('concepts deck: Space reveals, 2 rates and shows the next card', async ({ page }) => {
  await page.goto('/flashcards?deck=concepts');
  const front = page.getByTestId('card-front');
  await expect(front).toBeVisible();
  const first = await front.textContent();
  await expect(page.getByTestId('card-back')).toHaveCount(0);
  await page.keyboard.press('Space');
  await expect(page.getByTestId('card-back')).toBeVisible();
  await expect(page.getByTestId('task-tag')).toBeVisible();
  await page.keyboard.press('2');
  await expect(front).not.toHaveText(first ?? '');
});

test('anti-patterns cards show a trap badge', async ({ page }) => {
  await page.goto('/flashcards?deck=anti-patterns');
  await page.keyboard.press('Space');
  await expect(page.getByTestId('trap-badge')).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.getByTestId('card-front')).toBeVisible();
});

test('domain filter D3 shows only task 3.x cards', async ({ page }) => {
  await page.goto('/flashcards?deck=concepts&domain=D3');
  const seen = new Set<string>();
  for (let i = 0; i < 12; i++) {
    if (await page.getByTestId('cards-done').count()) break;
    await page.keyboard.press('Space');
    const tag = (await page.getByTestId('task-tag').textContent()) ?? '';
    expect(tag).toMatch(/^Task 3\.\d$/);
    seen.add(tag);
    const front = await page.getByTestId('card-front').textContent();
    await page.keyboard.press('3');
    await expect(page.getByTestId('card-front').or(page.getByTestId('cards-done'))).not.toHaveText(
      front ?? '',
    );
  }
  expect(seen.size).toBeGreaterThan(0);
});
