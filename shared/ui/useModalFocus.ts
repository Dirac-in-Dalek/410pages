import { useEffect, useRef } from 'react';

const modalStack: symbol[] = [];
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const useModalFocus = <T extends HTMLElement>(isOpen: boolean, onEscape: () => void) => {
  const containerRef = useRef<T>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const tokenRef = useRef(Symbol('modal'));
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  if (isOpen && !wasOpenRef.current && typeof document !== 'undefined') {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  wasOpenRef.current = isOpen;

  useEffect(() => {
    if (!isOpen) return;
    const token = tokenRef.current;
    modalStack.push(token);

    queueMicrotask(() => {
      const container = containerRef.current;
      if (!container || container.contains(document.activeElement)) return;
      const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? container).focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== token) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onEscapeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusableCandidates: HTMLElement[] = (
        containerRef.current
          ? Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
          : []
      ) as HTMLElement[];
      const focusable = focusableCandidates.filter(
        (element) => element.offsetParent !== null || element === document.activeElement
      );
      if (focusable.length === 0) {
        event.preventDefault();
        containerRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!containerRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      const index = modalStack.lastIndexOf(token);
      if (index >= 0) modalStack.splice(index, 1);
      const returnTarget = returnFocusRef.current;
      queueMicrotask(() => {
        if (returnTarget?.isConnected) returnTarget.focus();
      });
    };
  }, [isOpen]);

  return containerRef;
};
