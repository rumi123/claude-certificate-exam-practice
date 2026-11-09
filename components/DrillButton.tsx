import { startDrill } from '@/app/practice/actions';
import { Button } from '@/components/ui';

export default function DrillButton({
  taskId,
  className,
  label = 'Drill this task',
  variant = 'secondary',
}: {
  taskId: string;
  className?: string;
  label?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  return (
    <form action={startDrill} className="inline">
      <input type="hidden" name="taskId" value={taskId} />
      <Button type="submit" variant={variant} size="sm" className={className}>
        {label}
      </Button>
    </form>
  );
}
