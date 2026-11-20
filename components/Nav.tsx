'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  ChartColumn,
  ClipboardList,
  Layers,
  LayoutDashboard,
  List,
  Play,
  RotateCcw,
  Settings,
  Table2,
  type LucideIcon,
} from 'lucide-react';

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/learn', label: 'Learn', icon: BookOpen },
  { href: '/practice', label: 'Practice', icon: Play },
  { href: '/exams', label: 'Exams', icon: ClipboardList },
  { href: '/review', label: 'Review', icon: RotateCcw },
  { href: '/report', label: 'Report', icon: ChartColumn },
  { href: '/flashcards', label: 'Flashcards', icon: Layers },
  { href: '/cheatsheet', label: 'Decision sheet', icon: Table2 },
  { href: '/questions', label: 'Questions', icon: List },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export default function Nav({ dueCount = 0 }: { dueCount?: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-[96rem] items-center gap-3 px-4 py-2 lg:px-6">
        <span className="font-bold max-md:hidden">CCAR-F</span>
        <ul className="flex min-w-0 flex-1 justify-between gap-1 md:justify-start">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="min-w-0">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={
                    href === '/review' && dueCount > 0 ? `Review, ${dueCount} due` : undefined
                  }
                  className={`flex min-w-0 items-center gap-2 rounded-lg p-2 text-sm focus-visible:outline-2 focus-visible:outline-accent ${
                    active
                      ? 'bg-accent-soft font-semibold text-accent'
                      : 'text-fg hover:bg-surface-2'
                  }`}
                >
                  <Icon size={18} aria-hidden="true" className="shrink-0" />
                  <span className="max-sm:sr-only">{label}</span>
                  {href === '/review' && dueCount > 0 && (
                    <span
                      data-testid="review-badge"
                      className="rounded-full bg-weak px-1.5 py-0.5 text-xs font-semibold text-surface"
                    >
                      {dueCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
