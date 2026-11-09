'use client';

import { useEffect, useRef } from 'react';
import type { Confidence } from '@/lib/types';

export type ShortcutHandlers = {
  onOption: (index: number) => void;
  onConfidence: (value: Confidence) => void;
  onEnter: () => void;
  onMark: () => void;
};

const CONFIDENCE_KEYS: Record<string, Confidence> = { s: 'sure', u: 'unsure', g: 'guess' };
const NON_TEXT_INPUTS = new Set(['radio', 'checkbox', 'button', 'submit']);

function typingInto(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  return el instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(el.type);
}

// 1-5 pick an option, S/U/G set confidence, Enter submits or goes next, M marks.
export function useShortcuts(handlers: ShortcutHandlers): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || typingInto(e.target)) return;
      const h = ref.current;
      const key = e.key.toLowerCase();
      if (key >= '1' && key <= '5') {
        h.onOption(Number(key) - 1);
      } else if (key in CONFIDENCE_KEYS) {
        h.onConfidence(CONFIDENCE_KEYS[key]);
      } else if (key === 'm') {
        h.onMark();
      } else if (key === 'enter') {
        // A focused button or link already acts on Enter.
        if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return;
        h.onEnter();
      } else {
        return;
      }
      e.preventDefault();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
