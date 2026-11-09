import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { Chip } from '@/components/ui';

export default function TrapBadge({
  trap,
}: {
  trap: { id: string; name: string; description: string };
}) {
  return (
    <Chip tone="close" data-testid="trap-badge">
      <TriangleAlert size={12} aria-hidden="true" />
      <Link
        href={`/cheatsheet#trap-${trap.id}`}
        title={trap.description}
        className="hover:underline"
      >
        {trap.name}
      </Link>
    </Chip>
  );
}
