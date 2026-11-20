import { expect, test } from '@playwright/test';

const PAGES = [
  { label: 'Dashboard', href: '/' },
  { label: 'Learn', href: '/learn' },
  { label: 'Practice', href: '/practice' },
  { label: 'Exams', href: '/exams' },
  { label: 'Review', href: '/review' },
  { label: 'Report', href: '/report' },
  { label: 'Flashcards', href: '/flashcards' },
  { label: 'Decision sheet', href: '/cheatsheet' },
  { label: 'Questions', href: '/questions' },
  { label: 'Settings', href: '/settings' },
];

test('nav shell links to every page', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link')).toHaveCount(10);

  for (const { label, href } of PAGES) {
    await nav.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${href === '/' ? '/$' : href + '$'}`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(label);
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  }
});
