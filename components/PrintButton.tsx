'use client';

import { Printer } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui';

/**
 * Prints the page. While printing (from this button or the browser's own print), every
 * collapsed <details> is opened so nothing is left out, then closed again afterwards.
 */
export default function PrintButton() {
  useEffect(() => {
    let opened: HTMLDetailsElement[] = [];
    const before = () => {
      opened = Array.from(document.querySelectorAll<HTMLDetailsElement>('details:not([open])'));
      opened.forEach((d) => (d.open = true));
    };
    const after = () => {
      opened.forEach((d) => (d.open = false));
      opened = [];
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

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
