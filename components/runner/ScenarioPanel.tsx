'use client';

import { useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { InlineText } from '@/components/ui';

export default function ScenarioPanel({
  scenario,
  defaultOpen,
}: {
  scenario: { name: string; setup: string };
  defaultOpen: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  // At lg and up the panel is a side column, so it starts open whatever defaultOpen says.
  useEffect(() => {
    if (ref.current && window.matchMedia('(min-width: 1024px)').matches) ref.current.open = true;
  }, [defaultOpen]);

  return (
    <details
      ref={ref}
      open={defaultOpen}
      className="group rounded-xl border border-border bg-surface p-4"
    >
      <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <ChevronRight
          size={16}
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-90"
        />
        Scenario setup
      </summary>
      <p data-testid="scenario-setup" className="mt-2 whitespace-pre-wrap text-sm">
        <InlineText text={scenario.setup} />
      </p>
    </details>
  );
}
