import { Button } from '@/components/ui';

export default function AskClaudeButton() {
  return (
    <Button type="button" variant="ghost" size="sm" disabled title="AI features are off">
      Ask Claude
    </Button>
  );
}
