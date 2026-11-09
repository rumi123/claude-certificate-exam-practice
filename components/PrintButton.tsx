'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui';

export default function PrintButton() {
  return (
    <Button
      type="button"
      variant="ghost"
      className="print:hidden"
      icon={<Printer size={16} aria-hidden="true" />}
      onClick={() => window.print()}
    >
      Print
    </Button>
  );
}
