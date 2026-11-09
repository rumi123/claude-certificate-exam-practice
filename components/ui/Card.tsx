import type { ElementType, HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLElement> & { as?: ElementType; children?: ReactNode };

export function Card({ as: Tag = 'section', className = '', children, ...rest }: CardProps) {
  return (
    <Tag className={`rounded-xl border border-border bg-surface p-4 ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  icon,
  title,
  id,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  id?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 id={id} className="flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}
