import { expect, test } from '@playwright/test';
import { sql } from './helpers/db';
import { clearProgress, seedSession } from './helpers/seed';

test.describe.configure({ mode: 'serial' });
test.beforeAll(clearProgress);

test('Top 3 and Bank coverage reflect the seeded history; Continue links to an open session', async ({
  page,
}) => {
  seedSession([
    ...['S1-001', 'S1-002', 'S1-003', 'S1-004'].map((questionId) => ({
      questionId,
      correct: false,
    })),
    // Same history as report.spec.ts (S1-006 is tagged secondary 1.4, so it is avoided).
    { questionId: 'S1-005', correct: true },
    { questionId: 'S1-007', correct: true },
    { questionId: 'S1-005', correct: true },
    { questionId: 'S1-007', correct: false },
  ]);
  await page.goto('/');
  await expect(page.getByTestId('top3-item').first()).toHaveAttribute('data-task', '1.4');
  await expect(page.getByTestId('coverage-total')).toHaveText('6 / 50');
  await expect(page.getByTestId('dash-continue')).toHaveCount(0);

  await page.goto('/practice?scenario=S1&size=5&mode=study');
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
  const id = sql(`select id from session where status = 'in_progress' limit 1`);
  await page.goto('/');
  await expect(page.getByTestId('dash-continue').getByRole('link')).toHaveAttribute(
    'href',
    `/practice/${id}`,
  );
});
