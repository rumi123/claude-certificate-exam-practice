import { expect, test, type Page } from '@playwright/test';
import { latestSessionId, setClockOffset, sql } from './helpers/db';

test.afterEach(() => setClockOffset(0));

async function startSession(page: Page, query: string) {
  await page.goto(`/practice?${query}`);
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
}

async function finishWithConfirm(page: Page): Promise<string> {
  await page.getByTestId('finish-button').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const message = await dialog.innerText();
  await dialog.getByRole('button', { name: 'Submit', exact: true }).click();
  await page.waitForURL(/\/summary$/);
  return message;
}

test('test mode hides feedback, tracks answers in the navigator and ends in a summary', async ({
  page,
}) => {
  await startSession(page, 'scenario=S1&size=5&mode=test&multi=no');
  const sessionId = sql(`select ${latestSessionId}`);
  const explanations = sql(
    `select explanation from question_option where question_id in (select question_id from session_item where session_id='${sessionId}')`,
  )
    .split('\n')
    .filter((e) => e.length > 30);
  expect(explanations.length).toBeGreaterThan(5);

  for (let n = 1; n <= 3; n++) {
    await expect(page.getByTestId('progress')).toHaveText(`${n} / 5`);
    await page.getByRole('radio').first().check();
    await page.getByRole('radio', { name: 'Sure', exact: true }).check();
    const response = page.waitForResponse((r) => r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    const body = await (await response).text();
    for (const e of explanations) expect(body).not.toContain(e);
    await expect(page.getByTestId('progress')).toHaveText(`${n + 1} / 5`);
    await expect(page.getByTestId('feedback-option')).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveCount(0);
    const html = await page.content();
    for (const e of explanations) expect(html).not.toContain(e);
  }

  const nav = page.getByTestId('nav-item');
  await expect(nav).toHaveCount(5);
  await expect(page.locator('[data-testid="nav-item"][data-state="answered"]')).toHaveCount(3);
  await expect(page.locator('[data-testid="nav-item"][data-state="unanswered"]')).toHaveCount(2);

  // Previous goes back; the earlier answer is still selected and can be changed.
  await page.getByRole('link', { name: 'Previous' }).click();
  await expect(page.getByTestId('progress')).toHaveText('3 / 5');
  await expect(page.getByRole('radio', { name: 'Sure', exact: true })).toBeChecked();

  expect(await finishWithConfirm(page)).toContain('2 unanswered');
  await expect(page.getByTestId('score')).toHaveText(/Score: \d+ \/ 5/);
  await expect(page.getByRole('heading', { name: 'By domain' })).toBeVisible();
  await expect(page.getByTestId('summary-item')).toHaveCount(5);
  expect(sql(`select status, finished_at is not null from session where id='${sessionId}'`)).toBe(
    'completed|1',
  );
  expect(
    sql(
      `select count(*) from session_item where session_id='${sessionId}' and selected_json='[]' and is_correct=0`,
    ),
  ).toBe('2');
});

test('timer: an expired session is finished on load and unanswered items are wrong', async ({
  page,
}) => {
  await startSession(page, 'scenario=S1&size=5&mode=test&multi=no');
  await expect(page.getByTestId('timer')).toBeVisible();
  const sessionId = sql(`select ${latestSessionId}`);

  setClockOffset(60 * 60 * 1000);
  await page.reload();
  await expect(page).toHaveURL(/\/summary$/);
  await expect(page.getByTestId('summary-item').first()).toContainText('No answer');
  await expect(page.getByTestId('score')).toHaveText('Score: 0 / 5');
  expect(sql(`select status from session where id='${sessionId}'`)).toBe('completed');
});

test('Review mistakes now starts a session of the wrong items', async ({ page }) => {
  await startSession(page, 'scenario=S1&size=5&mode=test&multi=no');
  const oldId = sql(`select ${latestSessionId}`);
  await finishWithConfirm(page);
  const wrong = sql(
    `select group_concat(question_id) from (select question_id from session_item where session_id='${oldId}' and is_correct=0 order by position)`,
  );
  expect(wrong.split(',')).toHaveLength(5);

  await page.getByRole('button', { name: 'Review mistakes now' }).click();
  await page.waitForURL(/\/practice\/[^/?]+$/);
  const newId = sql(`select ${latestSessionId}`);
  expect(newId).not.toBe(oldId);
  expect(sql(`select mode from session where id='${newId}'`)).toBe('study');
  expect(
    sql(
      `select group_concat(question_id) from (select question_id from session_item where session_id='${newId}' order by position)`,
    ),
  ).toBe(wrong);
  await expect(page.getByTestId('progress')).toHaveText('1 / 5');
});
