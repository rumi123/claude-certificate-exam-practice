import type { Status } from '@/lib/analytics/types';
import { Chip } from '@/components/ui';
import { STATUS_LABEL, STATUS_TONE } from './format';

export default function StatusBadge({ status }: { status: Status }) {
  return <Chip tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Chip>;
}
