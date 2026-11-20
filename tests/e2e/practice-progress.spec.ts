import { expect, test } from '@playwright/test';
import { sql } from './helpers/db';
import { clearProgress, seedSession } from './helpers/seed';

function practiceIds(where: string): string[] {
  return sql(
    `select id from question where pool = 'practice' and retired = 0 and ${where} order by id`,
  )
    .split('\n')
    .filter(Boolean);
}

test.beforeEach(() => clearProgress());
test.afterAll(() => clearProgress());

test('a fully answered domain shows Completed and the count excludes attended', async ({
  page,
}) => {
  const domain = sql(
    `select domain_id from question where pool = 'practice' and retired = 0
     group by domain_id order by count(*) limit 1`,
  );
  const done = practiceIds(`domain_id = '${domain}'`);
  seedSession(done.map((questionId) => ({ questionId, correct: true })));

  await page.goto(`/practice?domain=${domain}`);
  await expect(page.getByTestId(`progress-${domain}`)).toHaveText('Completed');
  await expect(page.getByTestId('available')).toContainText(`All ${done.length} completed`);
});

test('a partly answered scenario shows what is left', async ({ page }) => {
  const scenario = sql(
    `select scenario_id from question where pool = 'practice' and retired = 0
     group by scenario_id having count(*) > 1 order by scenario_id limit 1`,
  );
  const all = practiceIds(`scenario_id = '${scenario}'`);
  seedSession([{ questionId: all[0]!, correct: false }]);

  await page.goto(`/practice?scenario=${scenario}`);
  const left = all.length - 1;
  await expect(page.getByTestId(`progress-${scenario}`)).toHaveText(
    `${left} of ${all.length} left`,
  );
  await expect(page.getByTestId('available')).toContainText(
    `(1 of ${all.length} already attended)`,
  );
});

test('with nothing answered the full count is available', async ({ page }) => {
  const total = practiceIds('1 = 1').length;
  await page.goto('/practice');
  await expect(page.getByTestId('available')).toHaveText(`${total} questions available`);
});
