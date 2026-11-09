import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type Props = Omit<ComponentProps<'button'>, 'children'> & {
  variant: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  href?: string;
  icon?: ReactNode;
  children?: ReactNode;
};

const VARIANT = {
  primary: 'bg-accent text-accent-fg hover:opacity-90',
  secondary: 'border border-border bg-surface text-fg hover:bg-surface-2',
  ghost: 'text-fg hover:bg-surface-2',
};
const SIZE = { sm: 'px-2.5 py-1 text-sm', md: 'px-4 py-2 text-sm' };

export function Button({
  variant,
  size = 'md',
  href,
  icon,
  className = '',
  children,
  ...buttonProps
}: Props) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {icon}
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...buttonProps}>
      {icon}
      {children}
    </button>
  );
}
