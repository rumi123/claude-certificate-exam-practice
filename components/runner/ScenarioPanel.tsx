import { ChevronRight } from 'lucide-react';
import { InlineText } from '@/components/ui';

export default function ScenarioPanel({
  scenario,
  defaultOpen,
}: {
  scenario: { name: string; setup: string };
  defaultOpen: boolean;
}) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-border bg-surface p-4">
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
