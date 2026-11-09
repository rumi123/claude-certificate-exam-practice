import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

const DB = 'test-results/e2e.db';

function sql(query: string): string {
  return execFileSync('sqlite3', [DB, query], { encoding: 'utf8' }).trim();
}

async function startSession(page: Page, query: string) {
  await page.goto(`/practice?${query}`);
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
}

test.beforeAll(() => {
  sql('delete from session_item; delete from session; delete from review_item;');
});

test('10-question study session on S1', async ({ page }) => {
  await startSession(page, 'scenario=S1&size=10&mode=study&multi=no');
  for (let n = 1; n <= 10; n++) {
    await expect(page.getByTestId('progress')).toHaveText(`${n} / 10`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Customer Support Resolution Agent',
    );
    if (n === 1) await expect(page.getByTestId('scenario-setup')).toBeVisible();
    await page.getByRole('radio').first().check();
    await page.getByRole('radio', { name: 'Sure', exact: true }).check();
    await page.getByRole('button', { name: 'Submit' }).click();
    const options = page.getByTestId('feedback-option');
    await expect(options.first()).toBeVisible();
    const count = await options.count();
    expect(count === 4 || count === 5).toBe(true);
    for (const text of await options.locator('p:nth-of-type(2)').allTextContents()) {
      expect(text.trim().length).toBeGreaterThan(0);
    }
    if (n === 1) {
      await expect(page.getByRole('status')).toHaveText(/Correct|Incorrect/);
      await expect(page.getByRole('button', { name: 'Ask Claude' })).toBeDisabled();
    }
    await page.getByRole('button', { name: n === 10 ? 'Finish' : 'Next', exact: true }).click();
  }
  await expect(page).toHaveURL(/\/summary$/);
  await expect(page.getByTestId('score')).toHaveText(/Score: \d+ \/ 10/);

  expect(
    sql(
      `select count(*), sum(answered_at is not null) from session_item where session_id=(select id from session order by started_at desc limit 1)`,
    ),
  ).toBe('10|10');
  const wrong = sql(
    `select count(*) from session_item where session_id=(select id from session order by started_at desc limit 1) and is_correct=0`,
  );
  expect(sql('select count(*) from review_item')).toBe(wrong);
  const orders = sql('select option_order_json from session_item limit 5').split('\n');
  expect(orders.every((o) => Array.isArray(JSON.parse(o)))).toBe(true);
  expect(
    orders.some((o) => {
      const keys = JSON.parse(o) as string[];
      return keys.join('') !== [...keys].sort().join('');
    }),
  ).toBe(true);
});

test('multiple-response question needs two picks and shows partial credit', async ({ page }) => {
  await startSession(page, 'scenario=S1&size=5&mode=study&multi=only');
  const submit = page.getByRole('button', { name: 'Submit' });
  const boxes = page.getByRole('checkbox');
  await expect(page.locator('legend', { hasText: 'Select 2' })).toBeVisible();
  await boxes.first().check();
  await page.getByRole('radio', { name: 'Sure', exact: true }).check();
  await expect(submit).toBeDisabled();
  await boxes.nth(1).check();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByRole('status')).toHaveText(/Correct|Incorrect|Partially correct/);
  await page.getByRole('button', { name: 'Next' }).click();

  // Second question: pick one right and one wrong option, found via the stored answers.
  await expect(page.getByTestId('progress')).toHaveText(/^2 \/ \d+$/);
  const key = sql(
    `select option_order_json from session_item where session_id=(select id from session order by started_at desc limit 1) and position=1`,
  );
  const order = JSON.parse(key) as string[];
  const right = order.indexOf('a');
  const wrong = order.findIndex((k) => k !== 'a' && k !== 'b');
  await boxes.nth(right).check();
  await boxes.nth(wrong).check();
  await page.getByRole('radio', { name: 'Sure', exact: true }).check();
  await submit.click();
  await expect(page.getByRole('status')).toHaveText(
    'Partially correct — 1 of 2 correct, counts as wrong',
  );
});
