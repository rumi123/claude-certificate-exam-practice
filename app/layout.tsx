import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import { now } from '@/lib/clock';
import { getPreferences } from '@/lib/db/queries/preferences';
import { getDueCount } from '@/lib/db/queries/review';
import './globals.css';

export const metadata: Metadata = {
  title: 'CCAR-F Practice',
  description: 'Local practice app for the CCAR-F exam',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { theme } = getPreferences();
  return (
    <html lang="en" className={theme === 'dark' ? 'dark' : undefined} data-theme={theme}>
      {/* Browser extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to <body>. */}
      <body className="min-h-screen bg-bg text-fg" suppressHydrationWarning>
        <Nav dueCount={getDueCount(now())} />
        <main className="mx-auto max-w-[96rem] px-4 py-6 lg:px-6">{children}</main>
      </body>
    </html>
  );
}
